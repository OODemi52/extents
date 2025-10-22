import { Selection } from "@heroui/react";

import { TreeNode } from "@/types/file-system";

type FsNodeMap = Record<
  string,
  {
    path: string;
    parentId: string | null;
  }
>;

export interface FlatNode extends TreeNode {
  level: number;
}

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
  level = 0,
): FlatNode[] => {
  let flattened: FlatNode[] = [];

  nodes.forEach((node) => {
    flattened.push({ ...node, level });
    const isExpanded = expandedKeys instanceof Set && expandedKeys.has(node.id);

    if (isExpanded && node.children?.length) {
      flattened = flattened.concat(
        flattenTreeList(node.children, expandedKeys, level + 1),
      );
    }
  });

  return flattened;
};
