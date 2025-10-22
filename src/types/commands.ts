import { TreeNode } from "./file-system";

/**
 * Command strings and their argument types.
 */
export interface CommandArgs {
  get_home_dir: null;
  get_children_dir_paths: { rootDirPath: string | null; scanLevel: number };
}

/**
 * Command strings and their return types.
 */
export interface CommandReturn {
  get_home_dir: string;
  get_children_dir_paths: TreeNode[];
}
