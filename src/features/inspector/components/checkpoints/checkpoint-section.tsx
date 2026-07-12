import type { InspectionCheckpoint } from "@/types/inspection-checkpoint";

import { useCallback, useEffect, useRef, useState } from "react";
import { CameraIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@heroui/button";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Tab, Tabs } from "@heroui/tabs";
import { convertFileSrc } from "@tauri-apps/api/core";

import { InspectorSection } from "../shared/inspector-section";

import { checkpointArtifact } from "./checkpoint-artifacts";
import {
  CheckpointCaptureModal,
  CheckpointConfirmationModal,
  type CheckpointCaptureProgress,
} from "./checkpoint-action-modal";
import { useInspectionCheckpoints } from "@/features/inspector/hooks/use-inspection-checkpoints";
import { useInspectionWorkspaceStore } from "@/features/inspector/store/inspection-workspace-store";
import { cn } from "@/lib/cn";

type PendingDeleteAction = "current-image" | "all" | null;

export function CheckpointSection() {
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [captureProgress, setCaptureProgress] =
    useState<CheckpointCaptureProgress | null>(null);
  const [captureRequestId, setCaptureRequestId] = useState(0);
  const captureMutateAsync = useRef<() => Promise<unknown>>(capturePlaceholder);
  const [pendingDeleteAction, setPendingDeleteAction] =
    useState<PendingDeleteAction>(null);
  const {
    allCheckpoints,
    currentImageCheckpoints,
    isLoading,
    error,
    capture,
    deleteCurrentImageCheckpoints,
    deleteAllCheckpoints,
    canCapture,
    canDeleteCurrentImageCheckpoints,
  } = useInspectionCheckpoints();
  const selectCheckpoint = useInspectionWorkspaceStore(
    (state) => state.selectCheckpoint,
  );
  const checkpointScope = useInspectionWorkspaceStore(
    (state) => state.checkpointScope,
  );
  const setCheckpointScope = useInspectionWorkspaceStore(
    (state) => state.setCheckpointScope,
  );
  const checkpoints =
    checkpointScope === "current" ? currentImageCheckpoints : allCheckpoints;
  const emptyMessage =
    checkpointScope === "current"
      ? "No capture sets for the current image."
      : "No capture sets saved.";
  const errorMessage =
    error instanceof Error ? error.message : error ? String(error) : null;
  const captureError =
    capture.error instanceof Error
      ? capture.error.message
      : capture.error
        ? String(capture.error)
        : null;
  const deleteCurrentError =
    deleteCurrentImageCheckpoints.error instanceof Error
      ? deleteCurrentImageCheckpoints.error.message
      : deleteCurrentImageCheckpoints.error
        ? String(deleteCurrentImageCheckpoints.error)
        : null;
  const deleteAllError =
    deleteAllCheckpoints.error instanceof Error
      ? deleteAllCheckpoints.error.message
      : deleteAllCheckpoints.error
        ? String(deleteAllCheckpoints.error)
        : null;
  const isDeleting =
    deleteCurrentImageCheckpoints.isPending || deleteAllCheckpoints.isPending;
  const clearAction: PendingDeleteAction =
    checkpointScope === "current" ? "current-image" : "all";
  const canClearCheckpoints =
    checkpointScope === "current"
      ? canDeleteCurrentImageCheckpoints &&
        currentImageCheckpoints.length > 0 &&
        !isDeleting
      : allCheckpoints.length > 0 && !isDeleting;
  const pendingDeleteIsLoading =
    pendingDeleteAction === "current-image"
      ? deleteCurrentImageCheckpoints.isPending
      : pendingDeleteAction === "all"
        ? deleteAllCheckpoints.isPending
        : false;
  const pendingDeleteCopy = getPendingDeleteCopy(pendingDeleteAction);
  const isCapturing = isCaptureModalOpen || capture.isPending;

  useEffect(() => {
    captureMutateAsync.current = () =>
      capture.mutateAsync({
        onProgress: setCaptureProgress,
      });
  });

  const handleCapture = useCallback(() => {
    if (!canCapture || isCapturing) {
      return;
    }

    setIsCaptureModalOpen(true);
    setCaptureProgress(null);
    setCaptureRequestId((requestId) => requestId + 1);
  }, [canCapture, isCapturing]);

  useEffect(() => {
    if (captureRequestId === 0) {
      return;
    }

    let isCancelled = false;

    const runCapture = async () => {
      await waitForCaptureModalPaint();

      if (isCancelled) {
        return;
      }

      try {
        await captureMutateAsync.current();
      } catch {
        // The mutation state owns the user-facing error message below.
      } finally {
        if (!isCancelled) {
          setIsCaptureModalOpen(false);
          setCaptureProgress(null);
        }
      }
    };

    void runCapture();

    return () => {
      isCancelled = true;
    };
  }, [captureRequestId]);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteAction || pendingDeleteIsLoading) {
      return;
    }

    try {
      if (pendingDeleteAction === "current-image") {
        await deleteCurrentImageCheckpoints.mutateAsync();
      } else {
        await deleteAllCheckpoints.mutateAsync();
      }

      setPendingDeleteAction(null);
    } catch {
      // The mutation state owns the user-facing error message below.
    }
  }, [
    deleteAllCheckpoints,
    deleteCurrentImageCheckpoints,
    pendingDeleteAction,
    pendingDeleteIsLoading,
  ]);

  return (
    <InspectorSection title="Capture Sets">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] text-zinc-500">
          Capture an exposure sweep for visual review.
        </div>
        <Button
          disableRipple
          className="h-8 shrink-0 rounded-[16px] border border-zinc-700/50 bg-[rgba(30,30,30,0.99)] px-3 text-[11px] text-zinc-300 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)] hover:bg-[rgba(50,50,50,0.99)] hover:text-white"
          isDisabled={!canCapture || isCapturing}
          size="sm"
          startContent={<CameraIcon size={14} />}
          onPress={handleCapture}
        >
          Capture Set
        </Button>
      </div>

      <Tabs
        disableCursorAnimation
        fullWidth
        aria-label="Capture set scope"
        className="flex flex-col min-h-0 text-muted"
        classNames={{
          tabList:
            "flex-shrink-0 rounded-[16px] border border-zinc-900/30 bg-[rgba(30,30,30,0.99)] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]",
          tab: "h-7 text-[11px] text-zinc-500 data-selected:border data-selected:border-zinc-700/30 data-selected:shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] data-selected:bg-[rgba(30,30,30,0.99)] data-selected:drop-shadow-[0_0_1px_rgba(0,0,0,0.6)] data-selected:rounded-xl",
          tabContent: "group-data-[selected=true]:text-zinc-100",
        }}
        selectedKey={checkpointScope}
        size="sm"
        variant="solid"
        onSelectionChange={(key) => {
          if (key === "current" || key === "all") {
            setCheckpointScope(key);
          }
        }}
      >
        <Tab key="current" title="Current Image" />
        <Tab key="all" title="All" />
      </Tabs>

      <Button
        disableRipple
        className={cn(
          "h-8 w-full rounded-[16px] border border-zinc-700/50 bg-[rgba(30,30,30,0.99)] px-3 text-[11px] text-zinc-300 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)] hover:bg-[rgba(50,50,50,0.99)] hover:text-white",
          "text-red-300 hover:text-red-200",
        )}
        isDisabled={!canClearCheckpoints}
        size="sm"
        startContent={<TrashIcon size={13} />}
        onPress={() => setPendingDeleteAction(clearAction)}
      >
        Clear All
      </Button>

      {captureError ? (
        <div className="text-xs text-red-400">{captureError}</div>
      ) : null}

      {deleteCurrentError || deleteAllError ? (
        <div className="text-xs text-red-400">
          {deleteCurrentError ?? deleteAllError}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="text-xs text-red-400">{errorMessage}</div>
      ) : null}

      {isLoading ? (
        <div className="text-xs text-zinc-500">Loading checkpoints...</div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {checkpoints.map((checkpoint) => (
          <CheckpointCard
            key={checkpoint.id}
            checkpoint={checkpoint}
            onSelect={selectCheckpoint}
          />
        ))}
      </div>

      {!isLoading && checkpoints.length === 0 ? (
        <div className="text-xs text-zinc-500">{emptyMessage}</div>
      ) : null}

      <CheckpointCaptureModal
        isOpen={isCaptureModalOpen}
        progress={captureProgress}
      />
      <CheckpointConfirmationModal
        confirmLabel={pendingDeleteCopy.confirmLabel}
        description={pendingDeleteCopy.description}
        isLoading={pendingDeleteIsLoading}
        isOpen={pendingDeleteAction !== null}
        title={pendingDeleteCopy.title}
        onCancel={() => setPendingDeleteAction(null)}
        onConfirm={handleConfirmDelete}
      />
    </InspectorSection>
  );
}

function CheckpointCard({
  checkpoint,
  onSelect,
}: {
  checkpoint: InspectionCheckpoint;
  onSelect: (checkpoint: InspectionCheckpoint) => void;
}) {
  const artifact = checkpointArtifact(checkpoint);
  const artifactSrc = artifact ? convertFileSrc(artifact.path) : null;

  return (
    <Card
      disableAnimation
      disableRipple
      isPressable
      className={cn(
        "group relative overflow-hidden rounded-[16px] p-0 text-left outline-none transition hover:bg-[rgba(50,50,50,0.99)] focus-visible:ring-2 focus-visible:ring-blue-500",
        "border border-zinc-700/50 bg-[rgba(30,30,30,0.99)] shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]",
      )}
      onPress={() => onSelect(checkpoint)}
    >
      <CardBody className="p-2">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-sm bg-zinc-950/70">
          {artifactSrc ? (
            <img
              alt={checkpoint.label || "Inspection checkpoint"}
              className="block max-h-full max-w-full object-contain"
              src={artifactSrc}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-zinc-600">
              No artifact
            </div>
          )}
        </div>
      </CardBody>
      <CardFooter className="block space-y-1 px-2 pb-2 pt-0">
        <div className="truncate text-[11px] text-zinc-200">
          {checkpoint.label || checkpoint.sourcePath.split("/").pop() || "-"}
        </div>
        <div className="truncate text-[10px] text-zinc-500">
          {checkpoint.artifacts.length > 1
            ? `${checkpoint.artifacts.length} variants`
            : formatCheckpointTime(checkpoint.createdAt)}
        </div>
      </CardFooter>
    </Card>
  );
}

async function capturePlaceholder() {}

const formatCheckpointTime = (timestamp: number) => {
  if (!Number.isFinite(timestamp)) {
    return "-";
  }

  return new Date(timestamp * 1000).toLocaleString();
};

const waitForCaptureModalPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, 250);
      });
    });
  });

const getPendingDeleteCopy = (action: PendingDeleteAction) => {
  if (action === "current-image") {
    return {
      title: "Clear current image capture sets?",
      description:
        "This will delete every inspection capture set for the current image.",
      confirmLabel: "Clear All",
    };
  }

  if (action === "all") {
    return {
      title: "Clear all capture sets?",
      description:
        "This will delete every inspection capture set currently stored by the app.",
      confirmLabel: "Clear All",
    };
  }

  return {
    title: "",
    description: "",
    confirmLabel: "Delete",
  };
};
