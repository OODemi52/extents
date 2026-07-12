import type { InspectionCheckpoint } from "@/types/inspection-checkpoint";

import { useCallback, useRef } from "react";
import { Button } from "@heroui/button";
import { convertFileSrc } from "@tauri-apps/api/core";

import {
  checkpointArtifacts,
  selectedCheckpointArtifact,
} from "./checkpoint-artifacts";
import { useInspectionWorkspaceStore } from "@/features/inspector/store/inspection-workspace-store";
import { cn } from "@/lib/cn";
import { formatDimensions } from "@/lib/formatters";

const MIN_REVIEW_SCALE = 0.25;
const MAX_REVIEW_SCALE = 12;
const REVIEW_ZOOM_STEP = 1.12;
const REVIEW_PAN_SPEED = 1.5;

export function CheckpointReviewViewport({
  checkpoint,
}: {
  checkpoint: InspectionCheckpoint;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const selectedArtifactId = useInspectionWorkspaceStore(
    (state) => state.selectedArtifactId,
  );
  const selectArtifact = useInspectionWorkspaceStore(
    (state) => state.selectArtifact,
  );
  const artifact = selectedCheckpointArtifact(checkpoint, selectedArtifactId);
  const artifactSrc = artifact ? convertFileSrc(artifact.path) : null;
  const artifacts = checkpointArtifacts(checkpoint);
  const scale = useInspectionWorkspaceStore(
    (state) => state.checkpointReviewScale,
  );
  const offsetX = useInspectionWorkspaceStore(
    (state) => state.checkpointReviewOffsetX,
  );
  const offsetY = useInspectionWorkspaceStore(
    (state) => state.checkpointReviewOffsetY,
  );
  const setTransform = useInspectionWorkspaceStore(
    (state) => state.setCheckpointReviewTransform,
  );
  const resetTransform = useInspectionWorkspaceStore(
    (state) => state.resetCheckpointReviewTransform,
  );
  const canPan = Boolean(artifactSrc);

  const zoomAroundPoint = useCallback(
    (clientX: number, clientY: number, nextScale: number) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        setTransform({ scale: nextScale });

        return;
      }

      const rect = viewport.getBoundingClientRect();
      const anchorX = clientX - rect.left - rect.width / 2;
      const anchorY = clientY - rect.top - rect.height / 2;
      const scaleRatio = nextScale / scale;

      setTransform({
        scale: nextScale,
        offsetX: anchorX - (anchorX - offsetX) * scaleRatio,
        offsetY: anchorY - (anchorY - offsetY) * scaleRatio,
      });
    },
    [offsetX, offsetY, scale, setTransform],
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!event.ctrlKey && !event.metaKey) {
        setTransform({
          offsetX: offsetX - event.deltaX * REVIEW_PAN_SPEED,
          offsetY: offsetY - event.deltaY * REVIEW_PAN_SPEED,
        });

        return;
      }

      const direction = event.deltaY > 0 ? -1 : 1;
      const zoomFactor =
        direction > 0 ? REVIEW_ZOOM_STEP : 1 / REVIEW_ZOOM_STEP;
      const nextScale = clamp(
        scale * zoomFactor,
        MIN_REVIEW_SCALE,
        MAX_REVIEW_SCALE,
      );

      zoomAroundPoint(event.clientX, event.clientY, nextScale);
    },
    [offsetX, offsetY, scale, setTransform, zoomAroundPoint],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      if (!canPan) {
        return;
      }

      event.preventDefault();

      dragStartRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        offsetX,
        offsetY,
      };

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canPan, offsetX, offsetY],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const dragStart = dragStartRef.current;

      if (!dragStart) {
        return;
      }

      event.preventDefault();

      setTransform({
        offsetX: dragStart.offsetX + event.clientX - dragStart.x,
        offsetY: dragStart.offsetY + event.clientY - dragStart.y,
      });
    },
    [setTransform],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const dragStart = dragStartRef.current;

      if (!dragStart) {
        return;
      }

      dragStartRef.current = null;

      try {
        event.currentTarget.releasePointerCapture(dragStart.pointerId);
      } catch {
        // Pointer capture may already be released if the OS cancels the drag.
      }
    },
    [],
  );

  return (
    <div
      ref={viewportRef}
      className={`absolute inset-0 z-10 flex h-full w-full flex-col overflow-hidden bg-[#191919] ${canPan ? "cursor-grab active:cursor-grabbing" : ""}`}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
    >
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        {artifactSrc ? (
          <img
            alt={checkpoint.label || "Inspection checkpoint"}
            className="max-h-full max-w-full select-none object-contain will-change-transform"
            draggable={false}
            src={artifactSrc}
            style={{
              transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
              transformOrigin: "center",
            }}
          />
        ) : (
          <div className="text-sm text-zinc-500">No checkpoint artifact.</div>
        )}
      </div>

      <div
        className={cn(
          "pointer-events-none absolute left-4 top-4 max-w-sm rounded-[16px] px-3 py-2 backdrop-blur",
          "border border-zinc-700/50 bg-[rgba(30,30,30,0.99)] shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]",
        )}
      >
        <div className="truncate text-xs text-zinc-200">
          {checkpoint.label || checkpoint.sourcePath.split("/").pop() || "-"}
        </div>
        <div className="mt-0.5 text-[10px] text-zinc-500">
          {artifact
            ? `${artifact.label || formatArtifactKind(artifact.kind)} / ${formatDimensions(artifact.width, artifact.height)}`
            : "No artifact"}
        </div>
      </div>

      <div
        className={cn(
          "absolute right-4 top-4 flex items-center gap-2 rounded-[16px] p-1 backdrop-blur",
          "border border-zinc-700/50 bg-[rgba(30,30,30,0.99)] shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]",
        )}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Button
          disableRipple
          className="h-7 min-w-0 rounded-[16px] border border-zinc-700/50 bg-[rgba(30,30,30,0.99)] px-2 text-[11px] text-zinc-300 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)] hover:bg-[rgba(50,50,50,0.99)] hover:text-white"
          size="sm"
          onPress={resetTransform}
        >
          Fit
        </Button>
        <div className="px-1 text-[11px] text-zinc-500">
          {Math.round(scale * 100)}%
        </div>
      </div>

      {artifacts.length > 1 ? (
        <div
          className={cn(
            "absolute bottom-4 left-1/2 flex max-w-[70%] -translate-x-1/2 gap-2 overflow-x-auto rounded-[16px] p-2 backdrop-blur",
            "border border-zinc-700/50 bg-[rgba(30,30,30,0.99)] shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]",
          )}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {artifacts.map((artifact) => (
            <Button
              key={artifact.id}
              disableRipple
              isIconOnly
              className={cn(
                "relative h-16 w-16 min-w-16 shrink-0 overflow-hidden rounded-[16px] p-1 outline-none hover:bg-[rgba(50,50,50,0.99)]",
                "border border-zinc-700/50 bg-[rgba(30,30,30,0.99)] shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]",
                selectedArtifactId === artifact.id
                  ? "ring-2 ring-blue-500"
                  : "",
              )}
              onPress={() => selectArtifact(artifact)}
            >
              <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-sm bg-zinc-950/70">
                <img
                  alt={artifact.label || artifact.kind}
                  className="block h-full w-full object-cover"
                  src={convertFileSrc(artifact.path)}
                />
              </span>
              {artifact.label ? (
                <span className="pointer-events-none absolute bottom-1 left-1 right-1 truncate rounded-sm bg-black/70 px-1 py-0.5 text-[8px] text-zinc-200">
                  {artifact.label}
                </span>
              ) : null}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const formatArtifactKind = (kind: string) => kind.replace(/_/g, " ");

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
