import { invokeTauri } from "./_client";

import { TreeNode } from "@/types/file-system";

interface GetChildrenDirArgs {
  rootDirPath: string | null;
  scanLevel: number;
}

export const getChildrenDirPaths = (
  args: GetChildrenDirArgs,
): Promise<TreeNode[]> => {
  return invokeTauri("get_children_dir_paths", args);
};

export const getHomeDir = (): Promise<string> => {
  return invokeTauri("get_home_dir", null);
};

export const startFolderScan = (args: {
  folderPath: string;
}): Promise<void> => {
  return invokeTauri("start_folder_scan", args);
};
