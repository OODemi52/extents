import type {
  InspectionCheckpoint,
  InspectionCheckpointArtifact,
} from "@/types/inspection-checkpoint";

export const checkpointArtifacts = (checkpoint: InspectionCheckpoint) =>
  checkpoint.artifacts.length > 0 ? checkpoint.artifacts : [];

export const checkpointArtifact = (checkpoint: InspectionCheckpoint) =>
  checkpointArtifacts(checkpoint).find(
    (artifact) => artifact.kind === "renderer_output",
  ) ??
  checkpointArtifacts(checkpoint)[0] ??
  null;

export const selectedCheckpointArtifact = (
  checkpoint: InspectionCheckpoint,
  artifactId: number | null,
): InspectionCheckpointArtifact | null =>
  checkpointArtifacts(checkpoint).find(
    (artifact) => artifact.id === artifactId,
  ) ?? checkpointArtifact(checkpoint);
