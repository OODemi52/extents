import { useQuery } from "@tanstack/react-query";

import { api } from "@/services/api";

/**
 * A React Query hook to fetch the immediate children of a given folder path.
 * @param folderPath The full path of the folder whose children we want to fetch.
 * @param options Options to control the query, e.g., `enabled`.
 */
export const useFolderChildren = (
  folderPath: string,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ["folderChildren", folderPath],
    queryFn: () =>
      api.fs.getChildrenDirPaths({
        rootDirPath: folderPath,
        scanLevel: 1,
      }),

    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });
};
