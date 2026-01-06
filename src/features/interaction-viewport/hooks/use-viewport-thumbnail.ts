import { useThumbnailQuery } from "@/features/gallery/hooks/use-thumbnails";

export function useViewportThumbnail(path: string | null) {
  const { thumbnailPath, isLoading, error } = useThumbnailQuery(path);

  return {
    thumbnailPath,
    isLoading,
    error,
  };
}
