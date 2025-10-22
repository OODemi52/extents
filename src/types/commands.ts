import { TreeNode } from "./file-system";

/**
 * Command strings and their argument types.
 */
export interface CommandArgs {
  // The backend command name is now 'get_children_dir_paths'
  get_children_dir_paths: { rootDirPath?: string; scanLevel: number };
}

/**
 * Command strings and their return types.
 */
export interface CommandReturn {
  // The backend now returns the fully nested tree structure directly.
  get_children_dir_paths: TreeNode[];
}
