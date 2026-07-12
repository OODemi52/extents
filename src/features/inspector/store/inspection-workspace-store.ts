import type {
  InspectionCheckpoint,
  InspectionCheckpointArtifact,
} from "@/types/inspection-checkpoint";

import { create } from "zustand";

type InspectionWorkspaceState = {
  inspectorPanelMode: "inspect" | "checkpoints";
  selectedCheckpoint: InspectionCheckpoint | null;
  selectedArtifactId: number | null;
  checkpointReviewScale: number;
  checkpointReviewOffsetX: number;
  checkpointReviewOffsetY: number;
  checkpointScope: "current" | "all";
  setInspectorPanelMode: (mode: "inspect" | "checkpoints") => void;
  selectCheckpoint: (checkpoint: InspectionCheckpoint) => void;
  selectArtifact: (artifact: InspectionCheckpointArtifact) => void;
  clearCheckpoint: () => void;
  setCheckpointReviewTransform: (transform: {
    scale?: number;
    offsetX?: number;
    offsetY?: number;
  }) => void;
  resetCheckpointReviewTransform: () => void;
  setCheckpointScope: (scope: "current" | "all") => void;
};

const firstArtifactId = (checkpoint: InspectionCheckpoint) =>
  checkpoint.artifacts[0]?.id ?? null;

export const useInspectionWorkspaceStore = create<InspectionWorkspaceState>(
  (set) => ({
    inspectorPanelMode: "inspect",
    selectedCheckpoint: null,
    selectedArtifactId: null,
    checkpointReviewScale: 1,
    checkpointReviewOffsetX: 0,
    checkpointReviewOffsetY: 0,
    checkpointScope: "current",
    setInspectorPanelMode: (mode) =>
      set((state) => ({
        inspectorPanelMode: mode,
        selectedCheckpoint:
          mode === "inspect" ? null : state.selectedCheckpoint,
        selectedArtifactId:
          mode === "inspect" ? null : state.selectedArtifactId,
        checkpointReviewScale:
          mode === "inspect" ? 1 : state.checkpointReviewScale,
        checkpointReviewOffsetX:
          mode === "inspect" ? 0 : state.checkpointReviewOffsetX,
        checkpointReviewOffsetY:
          mode === "inspect" ? 0 : state.checkpointReviewOffsetY,
      })),
    selectCheckpoint: (checkpoint) =>
      set({
        inspectorPanelMode: "checkpoints",
        selectedCheckpoint: checkpoint,
        selectedArtifactId: firstArtifactId(checkpoint),
        checkpointReviewScale: 1,
        checkpointReviewOffsetX: 0,
        checkpointReviewOffsetY: 0,
      }),
    selectArtifact: (artifact) =>
      set({
        selectedArtifactId: artifact.id,
        checkpointReviewScale: 1,
        checkpointReviewOffsetX: 0,
        checkpointReviewOffsetY: 0,
      }),
    clearCheckpoint: () =>
      set({
        selectedCheckpoint: null,
        selectedArtifactId: null,
        checkpointReviewScale: 1,
        checkpointReviewOffsetX: 0,
        checkpointReviewOffsetY: 0,
      }),
    setCheckpointReviewTransform: (transform) =>
      set((state) => ({
        checkpointReviewScale: transform.scale ?? state.checkpointReviewScale,
        checkpointReviewOffsetX:
          transform.offsetX ?? state.checkpointReviewOffsetX,
        checkpointReviewOffsetY:
          transform.offsetY ?? state.checkpointReviewOffsetY,
      })),
    resetCheckpointReviewTransform: () =>
      set({
        checkpointReviewScale: 1,
        checkpointReviewOffsetX: 0,
        checkpointReviewOffsetY: 0,
      }),
    setCheckpointScope: (scope) => set({ checkpointScope: scope }),
  }),
);
