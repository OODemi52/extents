import { invokeTauri } from "./_client";

import { TreeNode } from "@/types/file-system";

interface GetChildrenDirArgs {
  rootDirPath: string | undefined;
  scanLevel: number;
}

/**
 * Fetches a nested tree of directories from the Rust backend.
 * @param args - The root path to scan from and the depth of the scan.
 * @returns A promise that resolves to the root nodes of the directory tree.
 */
export const getChildrenDirPaths = (
  args: GetChildrenDirArgs,
): Promise<TreeNode[]> => {
  return invokeTauri("get_children_dir_paths", args);
};
