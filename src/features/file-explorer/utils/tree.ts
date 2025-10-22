import { Selection } from "@heroui/react";

import { TreeNode } from "@/types/file-system";

type FsNodeMap = Record<
  string,
  {
    path: string;
    parentId: string | null;
  }
>;

export function transformMapToTree(nodes: FsNodeMap): TreeNode[] {
  if (!nodes || typeof nodes !== "object") {
    return [];
  }

  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const id in nodes) {
    const node = nodes[id];
    const name = node.path.split("/").pop() || node.path;

    nodeMap.set(node.path, { id: node.path, name, children: [] });
  }

  nodeMap.forEach((treeNode, path) => {
    const parentPath = path.substring(0, path.lastIndexOf("/")) || null;
    const parentNode = parentPath ? nodeMap.get(parentPath) : null;

    if (parentNode) {
      parentNode.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  });

  nodeMap.forEach((node) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
  });
  roots.sort((a, b) => a.name.localeCompare(b.name));

  return roots;
}

export const flattenTreeList = (
  nodes: TreeNode[],
  expandedKeys: Selection,
): (TreeNode & { level: number })[] => {
  const flattened: (TreeNode & { level: number })[] = [];

  const walk = (items: TreeNode[], level: number) => {
    items.forEach((item) => {
      flattened.push({ ...item, level });
      // If the item is expanded and has children, recursively walk its children
      if (
        expandedKeys instanceof Set &&
        expandedKeys.has(item.id) &&
        item.children?.length > 0
      ) {
        walk(item.children, level + 1);
      }
    });
  };

  walk(nodes, 0);

  return flattened;
};
