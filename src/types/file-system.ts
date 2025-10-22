/**
 * Represents the shape of a single node's data from Rust.
 */
export type FsNode = {
  path: string;
  parentId: string | null;
};

/**
 * Represents the map-like object returned by the `build_fs_tree` command,
 * where the key is the node's ID (a string) and the value is the node's data.
 */
export type FsNodeMap = Record<string, FsNode>;

/**
 * Represents a node in the nested tree structure required by the UI components.
 */
export interface TreeViewElement {
  id: string;
  name: string;
  children: TreeViewElement[];
}
