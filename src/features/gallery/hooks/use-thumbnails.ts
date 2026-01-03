import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchThumbnail } from "../thumbnail/fetch-thumbnail";

import { api } from "@/services/api";
import { useImageStore } from "@/store/image-store";

const THUMBNAIL_CACHE_TTL_MS = 5 * 60 * 1000;
const PREFETCH_FLUSH_DELAY_MS = 50;

let activeFolderPath: string | null = null;
const prefetchedPaths = new Set<string>();
const pendingPrefetchPaths = new Set<string>();
let prefetchTimer: number | null = null;

export function useThumbnailQuery(imagePath: string) {
  const query = useQuery({
    queryKey: ["thumbnail", imagePath],
    queryFn: () => fetchThumbnail(imagePath),
    staleTime: Infinity,
    gcTime: THUMBNAIL_CACHE_TTL_MS,
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
  const currentFolderPath = useImageStore((state) => state.currentFolderPath);

  useEffect(() => {
    if (activeFolderPath !== currentFolderPath) {
      activeFolderPath = currentFolderPath;
      prefetchedPaths.clear();
      pendingPrefetchPaths.clear();
      if (prefetchTimer !== null) {
        clearTimeout(prefetchTimer);
        prefetchTimer = null;
      }
    }
  }, [currentFolderPath]);

  return (imagePaths: string | string[]) => {
    const paths = Array.isArray(imagePaths) ? imagePaths : [imagePaths];

    if (!paths.length) return;

    const nextPaths = paths.filter((path) => {
      if (prefetchedPaths.has(path)) {
        return false;
      }

      prefetchedPaths.add(path);

      return true;
    });

    if (!nextPaths.length) return;

    nextPaths.forEach((path) => pendingPrefetchPaths.add(path));

    if (prefetchTimer !== null) return;

    prefetchTimer = window.setTimeout(() => {
      prefetchTimer = null;

      if (!pendingPrefetchPaths.size) return;

      const pendingPaths = Array.from(pendingPrefetchPaths);

      pendingPrefetchPaths.clear();

      api.thumbnails.prefetch(pendingPaths).catch((error) => {
        console.error("[usePrefetchThumbnails] batch prefetch failed:", error);
      });
    }, PREFETCH_FLUSH_DELAY_MS);
  };
}
