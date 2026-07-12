import type {
  InspectionCheckpoint,
  InspectionCheckpointArtifact,
} from "@/types/inspection-checkpoint";
import type { TextureResourceInspection } from "@/types/inspection";

import { useCallback, useState } from "react";
import { ArrowLeftIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@heroui/button";
import { convertFileSrc } from "@tauri-apps/api/core";

import { CompactInspectorValue, InspectorRow } from "../shared/inspector-row";
import { InspectorSection } from "../shared/inspector-section";

import {
  checkpointArtifacts,
  selectedCheckpointArtifact,
} from "./checkpoint-artifacts";
import { CheckpointConfirmationModal } from "./checkpoint-action-modal";
import { useInspectionWorkspaceStore } from "@/features/inspector/store/inspection-workspace-store";
import { useInspectionCheckpoints } from "@/features/inspector/hooks/use-inspection-checkpoints";
import { cn } from "@/lib/cn";
import {
  formatDimensions,
  formatEv,
  formatMilliseconds,
} from "@/lib/formatters";

export function CheckpointDetailPanel({
  checkpoint,
}: {
  checkpoint: InspectionCheckpoint;
}) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const selectedArtifactId = useInspectionWorkspaceStore(
    (state) => state.selectedArtifactId,
  );
  const selectArtifact = useInspectionWorkspaceStore(
    (state) => state.selectArtifact,
  );
  const clearCheckpoint = useInspectionWorkspaceStore(
    (state) => state.clearCheckpoint,
  );
  const { deleteCheckpoint } = useInspectionCheckpoints();
  const artifact = selectedCheckpointArtifact(checkpoint, selectedArtifactId);
  const image = checkpoint.rendererSnapshot.image;
  const raw = image?.raw ?? null;
  const pipeline = checkpoint.rendererSnapshot.pipeline;
  const textures = checkpoint.rendererSnapshot.textures;
  const timings = checkpoint.rendererSnapshot.timings;
  const handleDeleteCheckpoint = useCallback(async () => {
    if (deleteCheckpoint.isPending) {
      return;
    }

    try {
      await deleteCheckpoint.mutateAsync(checkpoint.id);
      setIsDeleteModalOpen(false);
    } catch {
      // The mutation state owns the user-facing error message below.
    }
  }, [checkpoint.id, deleteCheckpoint]);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Button
          disableRipple
          isIconOnly
          aria-label="Back to capture sets"
          className="h-8 w-8 min-w-8 rounded-[16px] border border-zinc-700/50 bg-[rgba(30,30,30,0.99)] p-0 text-[11px] text-zinc-300 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)] hover:bg-[rgba(50,50,50,0.99)] hover:text-white"
          size="sm"
          onPress={clearCheckpoint}
        >
          <ArrowLeftIcon size={14} />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-zinc-200">
            {checkpoint.label || checkpointName(checkpoint)}
          </div>
          <div className="truncate text-[10px] text-zinc-500">
            {formatCheckpointTime(checkpoint.createdAt)}
          </div>
        </div>
        <Button
          disableRipple
          isIconOnly
          aria-label="Delete capture set"
          className={cn(
            "h-8 w-8 min-w-8 rounded-[16px] border border-zinc-700/50 bg-[rgba(30,30,30,0.99)] p-0 text-[11px] text-zinc-300 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)] hover:bg-[rgba(50,50,50,0.99)] hover:text-white",
            "text-red-300 hover:text-red-200",
          )}
          isDisabled={deleteCheckpoint.isPending}
          size="sm"
          onPress={() => setIsDeleteModalOpen(true)}
        >
          <TrashIcon size={14} />
        </Button>
      </div>

      {deleteCheckpoint.error ? (
        <div className="text-xs text-red-400">
          {deleteCheckpoint.error instanceof Error
            ? deleteCheckpoint.error.message
            : String(deleteCheckpoint.error)}
        </div>
      ) : null}

      <CheckpointVariantSection
        artifacts={checkpointArtifacts(checkpoint)}
        selectedArtifact={artifact}
        onSelect={selectArtifact}
      />

      <InspectorSection title="Source">
        <InspectorRow label="File" value={checkpointName(checkpoint)} />
        <InspectorRow label="Path" value={checkpoint.sourcePath} />
        <InspectorRow label="Layout" value={checkpoint.activeLayout} />
        <InspectorRow label="App Version" value={checkpoint.appVersion} />
      </InspectorSection>

      <InspectorSection title="Artifact">
        <InspectorRow label="Variant" value={formatArtifactLabel(artifact)} />
        <InspectorRow label="Kind" value={formatArtifactKind(artifact?.kind)} />
        <InspectorRow
          label="Dimensions"
          value={formatDimensions(artifact?.width, artifact?.height)}
        />
        <InspectorRow label="MIME" value={artifact?.mimeType ?? "-"} />
      </InspectorSection>

      <InspectorSection title="Viewport">
        <div className="grid grid-cols-3 gap-2">
          <CompactInspectorValue
            label="Scale"
            value={formatNumber(checkpoint.viewport.scale, 3)}
          />
          <CompactInspectorValue
            label="Offset X"
            value={formatNumber(checkpoint.viewport.offsetX, 3)}
          />
          <CompactInspectorValue
            label="Offset Y"
            value={formatNumber(checkpoint.viewport.offsetY, 3)}
          />
        </div>
      </InspectorSection>

      <InspectorSection title="Recipe">
        <InspectorRow
          label="Exposure"
          value={formatEv(checkpoint.editRecipe.exposure_ev)}
        />
      </InspectorSection>

      <InspectorSection title="Captured Image">
        <InspectorRow label="Source" value={image?.sourceKind ?? "-"} />
        <InspectorRow
          label="Dimensions"
          value={formatDimensions(image?.width, image?.height)}
        />
        <InspectorRow label="Development" value={pipeline.developmentSource} />
        <InspectorRow label="Display" value={pipeline.displayIntent} />
        <InspectorRow
          label="Base Exposure"
          value={formatEv(pipeline.baseExposureEv)}
        />
        <InspectorRow
          label="User Exposure"
          value={formatEv(pipeline.userExposureEv)}
        />
      </InspectorSection>

      {raw ? (
        <InspectorSection title="RAW">
          <InspectorRow
            label="Camera"
            value={`${raw.cameraMake || "-"} ${raw.cameraModel || ""}`.trim()}
          />
          <InspectorRow label="CFA" value={raw.cfa.name} />
          <InspectorRow
            label="Sensor"
            value={formatDimensions(
              raw.sensorDimensions.width,
              raw.sensorDimensions.height,
            )}
          />
          <InspectorRow
            label="Crop"
            value={`${raw.cropArea.width} x ${raw.cropArea.height} @ ${raw.cropArea.x}, ${raw.cropArea.y}`}
          />
          <InspectorRow label="Bit Depth" value={`${raw.bitsPerSample} bits`} />
          <InspectorRow
            label="Black"
            value={formatNumberList(raw.normalizedBlackLevels)}
          />
          <InspectorRow
            label="White"
            value={formatNumberList(raw.normalizedWhiteLevels)}
          />
          <InspectorRow
            label="WB"
            value={formatNumberList(raw.headroomWhiteBalance)}
          />
        </InspectorSection>
      ) : null}

      <InspectorSection title="Graph">
        <InspectorRow label="Source" value={formatTexture(textures.source)} />
        <InspectorRow
          label="Development"
          value={formatTexture(textures.developmentOutput)}
        />
        <InspectorRow
          label="Adjustment"
          value={formatTexture(textures.adjustmentOutput)}
        />
        <InspectorRow
          label="Display"
          value={formatTexture(textures.displayOutput)}
        />
        <InspectorRow label="Surface" value={formatTexture(textures.surface)} />
      </InspectorSection>

      <InspectorSection title="Timing">
        <InspectorRow
          label="Input Build"
          value={formatMilliseconds(timings.inputBuildMs)}
        />
      </InspectorSection>

      {checkpoint.notes ? (
        <InspectorSection title="Notes">
          <div className="whitespace-pre-wrap text-xs text-zinc-300">
            {checkpoint.notes}
          </div>
        </InspectorSection>
      ) : null}

      <CheckpointConfirmationModal
        confirmLabel="Delete"
        description="This will delete this inspection capture set and its artifacts."
        isLoading={deleteCheckpoint.isPending}
        isOpen={isDeleteModalOpen}
        title="Delete capture set?"
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteCheckpoint}
      />
    </>
  );
}

function CheckpointVariantSection({
  artifacts,
  selectedArtifact,
  onSelect,
}: {
  artifacts: InspectionCheckpointArtifact[];
  selectedArtifact: InspectionCheckpointArtifact | null;
  onSelect: (artifact: InspectionCheckpointArtifact) => void;
}) {
  if (artifacts.length <= 1) {
    return null;
  }

  return (
    <InspectorSection title="Variants">
      <div className="grid grid-cols-5 gap-1.5">
        {artifacts.map((artifact) => (
          <button
            key={artifact.id}
            className={cn(
              "min-w-0 rounded-[16px] p-1 text-left outline-none transition hover:bg-[rgba(50,50,50,0.99)] focus-visible:ring-2 focus-visible:ring-blue-500",
              "border border-zinc-700/50 bg-[rgba(30,30,30,0.99)] shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]",
              selectedArtifact?.id === artifact.id
                ? "ring-2 ring-blue-500"
                : "",
            )}
            type="button"
            onClick={() => onSelect(artifact)}
          >
            <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-sm bg-zinc-950/70">
              <img
                alt={artifact.label || artifact.kind}
                className="block h-full w-full object-cover"
                src={convertFileSrc(artifact.path)}
              />
            </span>
            <span className="mt-1 block truncate text-center text-[9px] text-zinc-300">
              {artifact.label || formatArtifactKind(artifact.kind)}
            </span>
          </button>
        ))}
      </div>
    </InspectorSection>
  );
}

const checkpointName = (checkpoint: InspectionCheckpoint) =>
  checkpoint.label || checkpoint.sourcePath.split("/").pop() || "-";

const formatCheckpointTime = (timestamp: number) => {
  if (!Number.isFinite(timestamp)) {
    return "-";
  }

  return new Date(timestamp * 1000).toLocaleString();
};

const formatNumber = (value: number | null | undefined, digits = 2) => {
  if (!Number.isFinite(value) || value == null) {
    return "-";
  }

  return value.toFixed(digits);
};

const formatNumberList = (values: number[] | null | undefined) => {
  if (!values?.length) {
    return "-";
  }

  return values.map((value) => formatNumber(value, 4)).join(", ");
};

const formatArtifactKind = (kind: string | null | undefined) =>
  kind ? kind.replace(/_/g, " ") : "-";

const formatArtifactLabel = (
  artifact: InspectionCheckpointArtifact | null | undefined,
) => artifact?.label || formatArtifactKind(artifact?.kind);

const formatTexture = (texture: TextureResourceInspection) =>
  `${texture.format} / ${formatDimensions(texture.width, texture.height)}`;
