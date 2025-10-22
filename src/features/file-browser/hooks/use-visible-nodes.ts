import { Selection } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { useFileSystemStore } from "../store/file-system-store";
import { flattenTreeList } from "../utils/tree";

import { api } from "@/services/api";
import { TreeNode } from "@/types/file-system";

/**
 * Helper function to recursively find a node and add its children
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
  const [tree, setTree] = useState<TreeNode[]>([]);
  const { expandedKeys } = useFileSystemStore();
  const queryClient = useQueryClient();
  const prevExpandedKeysRef = useRef<Selection>(new Set());

  useEffect(() => {
    const fetchRoot = async () => {
      try {
        const homeDir = await queryClient.fetchQuery({
          queryKey: ["homeDir"],
          queryFn: () => api.fs.getHomeDir(),
        });

        const first_level_children = await queryClient.fetchQuery({
          queryKey: ["folderChildren", homeDir],
          queryFn: () =>
            api.fs.getChildrenDirPaths({
              rootDirPath: homeDir,
              scanLevel: 1,
            }),
        });

        const homeName = homeDir.split(/[\\/]/).filter(Boolean).pop() || "Home";

        setTree([
          { id: homeDir, name: homeName, children: first_level_children },
        ]);

        useFileSystemStore.getState().setExpandedKeys(new Set([homeDir]));
        prevExpandedKeysRef.current = new Set([homeDir]);
      } catch (error) {
        throw error;
      }
    };

    fetchRoot();
  }, [queryClient]);

  useEffect(() => {
    const currentKeys =
      expandedKeys instanceof Set ? expandedKeys : new Set<string>();

    const prevKeys =
      prevExpandedKeysRef.current instanceof Set
        ? prevExpandedKeysRef.current
        : new Set<string>();

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
              throw error;
            }
          };

          fetchAndAdd();
        }
      }
    });

    prevExpandedKeysRef.current = currentKeys;
  }, [expandedKeys, queryClient, tree]);

  const visibleNodes = useMemo(
    () => flattenTreeList(tree, expandedKeys),
    [tree, expandedKeys],
  );

  return visibleNodes;
};
