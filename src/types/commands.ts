import { FsNodeMap } from "./file-system";

/**
 * Command strings and their argument types.
 */
export interface CommandArgs {
  build_fs_tree: { scanLevel: number };
}

/**
 * Command strings and their return types.
 */
export interface CommandReturn {
  build_fs_tree: FsNodeMap;
}
