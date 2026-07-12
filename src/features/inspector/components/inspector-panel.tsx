import { GraphInspectionSection } from "./graph/graph-inspection-section";
import { CheckpointDetailPanel } from "./checkpoints/checkpoint-detail-panel";
import { CheckpointSection } from "./checkpoints/checkpoint-section";
import { ImageInspectionSection } from "./image/image-inspection-section";
import { RawMetadataSection } from "./image/raw-metadata-section";
import { PipelineInspectionSection } from "./pipeline/pipeline-inspection-section";
import { TimingInspectionSection } from "./timing/timing-inspection-section";

import { useRendererInspection } from "@/features/inspector/hooks/use-renderer-inspection";
import { useInspectionWorkspaceStore } from "@/features/inspector/store/inspection-workspace-store";

export function InspectorPanel() {
  const { snapshot, isLoading, error } = useRendererInspection();
  const inspectorPanelMode = useInspectionWorkspaceStore(
    (state) => state.inspectorPanelMode,
  );
  const selectedCheckpoint = useInspectionWorkspaceStore(
    (state) => state.selectedCheckpoint,
  );
  const hasImage = Boolean(snapshot?.hasImage);
  const image = hasImage ? (snapshot?.image ?? null) : null;
  const pipeline = hasImage ? (snapshot?.pipeline ?? null) : null;
  const textures = hasImage ? (snapshot?.textures ?? null) : null;
  const timings = hasImage ? (snapshot?.timings ?? null) : null;

  return (
    <aside className="mr-2 flex h-full flex-col gap-4 overflow-y-auto rounded-3xl border border-white/5 bg-[rgba(30,30,30,0.99)] p-4 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]">
      <div className="text-sm text-zinc-300">Inspector</div>

      {inspectorPanelMode === "checkpoints" ? (
        selectedCheckpoint ? (
          <CheckpointDetailPanel checkpoint={selectedCheckpoint} />
        ) : (
          <CheckpointSection />
        )
      ) : (
        <>
          {isLoading ? (
            <div className="text-xs text-zinc-500">
              Reading renderer state...
            </div>
          ) : null}

          {error ? <div className="text-xs text-red-400">{error}</div> : null}

          {hasImage ? (
            <>
              <ImageInspectionSection image={image} />
              <RawMetadataSection raw={image?.raw ?? null} />
              <PipelineInspectionSection pipeline={pipeline} />
              <GraphInspectionSection textures={textures} />
              <TimingInspectionSection timings={timings} />
            </>
          ) : (
            <div className="text-xs text-zinc-500">
              Open an image to inspect renderer state.
            </div>
          )}
        </>
      )}
    </aside>
  );
}
