import { Selection } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { useFileSystemStore } from "../store/file-system-store";
import { flattenTreeList } from "../utils/tree";

import { api } from "@/services/api";
import { TreeNode } from "@/types/file-system";

/**
 * Helper function to recursively find a node and add its children
 * @param nodes
 * @param parentId
 * @param children
 * @returns TreeNode[]
 */
const addChildrenToNode = (
  nodes: TreeNode[],
  parentId: string,
  children: TreeNode[],
): TreeNode[] => {
  return nodes.map((node) => {
    if (node.id === parentId) {
      if (node.children.length > 0) return node;

      return { ...node, children };
    }
    if (node.children?.length > 0) {
      return {
        ...node,
        children: addChildrenToNode(node.children, parentId, children),
      };
    }

    return node;
  });
};

export const useVisibleNodes = () => {
  const [tree, setTree] = useState<TreeNode[]>([
    { id: "/", name: "My Computer", children: [] },
  ]);

  const { expandedKeys } = useFileSystemStore();

  const queryClient = useQueryClient();
  const prevExpandedKeysRef = useRef<Selection>(expandedKeys);

  useEffect(() => {
    const currentKeys = new Set(expandedKeys);
    const prevKeys = new Set(prevExpandedKeysRef.current);

    const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNodeById(node.children, id);

          if (found) return found;
        }
      }

      return null;
    };

    currentKeys.forEach((key) => {
      if (typeof key === "string" && !prevKeys.has(key)) {
        const node = findNodeById(tree, key);

        if (node && node.children.length === 0) {
          const fetchAndAdd = async () => {
            try {
              const children = await queryClient.fetchQuery({
                queryKey: ["folderChildren", key],
                queryFn: () =>
                  api.fs.getChildrenDirPaths({
                    rootDirPath: key,
                    scanLevel: 1,
                  }),
              });

              setTree((currentTree) =>
                addChildrenToNode(currentTree, key, children),
              );
            } catch (error) {
              throw `[useVisibleNodes]: Key: ${key} Error: ${error} `;
            }
          };

          fetchAndAdd();
        }
      }
    });

    prevExpandedKeysRef.current = expandedKeys;
  }, [expandedKeys, tree, queryClient]);

  const visibleNodes = useMemo(
    () => flattenTreeList(tree, expandedKeys),
    [tree, expandedKeys],
  );

  return visibleNodes;
};
