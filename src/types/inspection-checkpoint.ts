import type { InspectionSnapshot } from "./inspection";
import type { EditRecipe } from "./sidecar";

export type CheckpointViewport = {
  activeLayout: string;
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type CreateInspectionCheckpointSetRequest = {
  sourcePath: string;
  label?: string | null;
  activeLayout: string;
  viewport: CheckpointViewport;
  editRecipe: EditRecipe;
  notes?: string | null;
};

export type CaptureInspectionCheckpointVariant = {
  label: string;
  editRecipe: EditRecipe;
};

export type CaptureInspectionCheckpointArtifactRequest = {
  checkpointId: number;
  variantIndex: number;
  label: string;
  editRecipe: EditRecipe;
  restoreEditRecipe: EditRecipe;
};

export type InspectionCheckpointArtifact = {
  id: number;
  checkpointId: number;
  kind: string;
  label: string;
  path: string;
  width: number;
  height: number;
  mimeType: string;
  createdAt: number;
};

export type InspectionCheckpoint = {
  id: number;
  createdAt: number;
  label: string;
  sourcePath: string;
  activeLayout: string;
  viewport: CheckpointViewport;
  editRecipe: EditRecipe;
  rendererSnapshot: InspectionSnapshot;
  appVersion: string;
  notes: string;
  artifacts: InspectionCheckpointArtifact[];
};
