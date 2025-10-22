import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { transformFlatToTree } from "../utils/tree";

import { api } from "@/services/api";

export const useFileTree = () => {
  const {
    data: flatNodeMap,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["fileTree"],
    queryFn: api.fs.buildFileTree,
  });

  const tree = useMemo(() => {
    if (!flatNodeMap) return [];

    return transformFlatToTree(flatNodeMap);
  }, [flatNodeMap]);

  return { tree, isLoading, error };
};
