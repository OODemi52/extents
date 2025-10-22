/**
 * Represents a node in the nested tree structure, used by both the
 * Rust backend (as a return type) and the React frontend (for rendering).
 */
export interface TreeViewElement {
  id: string;
  name: string;
  children: TreeViewElement[];
}
