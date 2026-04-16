import type { CommandArgs } from "@/types/commands";

import { invokeTauri } from "./_client";

export const getChildrenDirPaths = (
  args: CommandArgs["get_children_dir_paths"],
) => invokeTauri("get_children_dir_paths", args);

export const getHomeDir = () => invokeTauri("get_home_dir", null);

export const startFolderScan = (args: CommandArgs["start_folder_scan"]) =>
  invokeTauri("start_folder_scan", args);
