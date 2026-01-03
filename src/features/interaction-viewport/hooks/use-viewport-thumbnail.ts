import { useQuery } from "@tanstack/react-query";

import { api } from "@/services/api";

export function useViewportThumbnail(path: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["image-thumbnail", path],
    queryFn: async () => {
      if (!path) {
        throw new Error("No image path provided");
      }

      return api.thumbnails.get(path);
    },
    enabled: Boolean(path),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const errorMessage =
    error instanceof Error ? error.message : error ? String(error) : null;

  return {
    thumbnailPath: data ?? null,
    isLoading,
    error: errorMessage,
  };
}
