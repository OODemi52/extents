import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchThumbnail } from "../thumbnail/fetch-thumbnail";

import { api } from "@/services/api";
import { useImageStore } from "@/store/image-store";

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
  const prefetchedPathsRef = useRef<Set<string>>(new Set());
  const currentFolderPath = useImageStore((state) => state.currentFolderPath);

  useEffect(() => {
    prefetchedPathsRef.current.clear();
  }, [currentFolderPath]);

  return (imagePaths: string | string[]) => {
    const paths = Array.isArray(imagePaths) ? imagePaths : [imagePaths];

    if (!paths.length) return;

    const prefetchedPaths = prefetchedPathsRef.current;
    const nextPaths = paths.filter((path) => {
      if (prefetchedPaths.has(path)) {
        return false;
      }

      prefetchedPaths.add(path);

      return true;
    });

    if (!nextPaths.length) return;

    api.thumbnails.prefetch(nextPaths).catch((error) => {
      console.error("[usePrefetchThumbnails] batch prefetch failed:", error);
    });
  };
}
