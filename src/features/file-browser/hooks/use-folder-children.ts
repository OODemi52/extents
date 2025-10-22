import { useQuery } from "@tanstack/react-query";

import { api } from "@/services/api";

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
