import { FsNodeMap, TreeViewElement } from "@/types/file-system";

/**
 * Transforms the flat map of nodes from the Rust backend into a nested
 * tree structure suitable for rendering in the UI.
 * @param nodes The map-like object from Rust, where the key is the node ID.
 * @returns An array of root-level tree nodes, with children nested inside.
 */
export function transformFlatToTree(nodes: FsNodeMap): TreeViewElement[] {
  // Handle cases where the data might be null or not an object
  if (!nodes || typeof nodes !== "object") {
    return [];
  }

  const nodeMap = new Map<string, TreeViewElement>();
  const roots: TreeViewElement[] = [];

  // First pass: create a map of all nodes and initialize them
  for (const id in nodes) {
    const node = nodes[id];
    const name = node.path.split("/").pop() || node.path;

    nodeMap.set(id, { id, name, children: [] });
  }

  // Second pass: link children to their parents
  for (const id in nodes) {
    const node = nodes[id];
    const treeNode = nodeMap.get(id);

    if (!treeNode) continue;

    if (node.parentId && nodeMap.has(node.parentId)) {
      const parentNode = nodeMap.get(node.parentId);

      if (parentNode) {
        // Check to avoid adding duplicates if the function is ever called with redundant data
        if (!parentNode.children.some((child) => child.id === treeNode.id)) {
          parentNode.children.push(treeNode);
          // Sort children alphabetically by name for a consistent order
          parentNode.children.sort((a, b) => a.name.localeCompare(b.name));
        }
      }
    } else {
      // If no parentId or the parent isn't in the map, it's a root node
      roots.push(treeNode);
    }
  }

  // Sort the root nodes as well
  roots.sort((a, b) => a.name.localeCompare(b.name));

  return roots;

  console.log("roots", roots);
}
