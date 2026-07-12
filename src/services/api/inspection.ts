import type { CommandArgs } from "@/types/commands";
import type {
  CaptureInspectionCheckpointArtifactRequest,
  CreateInspectionCheckpointSetRequest,
} from "@/types/inspection-checkpoint";

import { invokeTauri } from "./_client";

export const createCheckpointSet = (
  request: CreateInspectionCheckpointSetRequest,
) => invokeTauri("create_inspection_checkpoint_set", { request });

export const captureCheckpointArtifact = (
  request: CaptureInspectionCheckpointArtifactRequest,
) => invokeTauri("capture_inspection_checkpoint_artifact", { request });

export const listCheckpoints = (
  args: CommandArgs["list_inspection_checkpoints"] = {},
) => invokeTauri("list_inspection_checkpoints", args);

export const listCheckpointsForSource = (
  args: CommandArgs["list_inspection_checkpoints_for_source"]["request"],
) =>
  invokeTauri("list_inspection_checkpoints_for_source", {
    request: args,
  });

export const deleteCheckpoint = (
  args: CommandArgs["delete_inspection_checkpoint"],
) => invokeTauri("delete_inspection_checkpoint", args);

export const deleteCheckpointsForSource = (sourcePath: string) =>
  invokeTauri("delete_inspection_checkpoints_for_source", {
    request: { sourcePath },
  });

export const deleteAllCheckpoints = () =>
  invokeTauri("delete_all_inspection_checkpoints", null);
