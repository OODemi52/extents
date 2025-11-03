import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchThumbnail } from "../utils/fetch-thumbnail";

export function useThumbnailQuery(imagePath: string) {
  const query = useQuery({
    queryKey: ["thumbnail", imagePath],
    queryFn: () => fetchThumbnail(imagePath),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return {
    thumbnail: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? String(query.error) : null,
  };
}

export function useClearThumbnailCache() {
  const queryClient = useQueryClient();

  return (imagePath?: string) => {
    if (imagePath) {
      queryClient.removeQueries({ queryKey: ["thumbnail", imagePath] });
    } else {
      queryClient.removeQueries({ queryKey: ["thumbnail"] });
    }
  };
}

export function usePrefetchThumbnails() {
  const queryClient = useQueryClient();

  return (imagePaths: string | string[]) => {
    const paths = Array.isArray(imagePaths) ? imagePaths : [imagePaths];

    paths.forEach((path) => {
      queryClient.prefetchQuery({
        queryKey: ["thumbnail", path],
        queryFn: () => fetchThumbnail(path),
        staleTime: Infinity,
      });
    });
  };
}
