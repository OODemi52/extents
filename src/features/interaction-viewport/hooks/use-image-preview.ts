import type { PreviewInfo } from "@/services/api/image";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/services/api";

type UseImagePreviewOptions = {
  enabled?: boolean;
};

export function useImagePreview(
  path: string | null,
  options: UseImagePreviewOptions = {},
) {
  const shouldEnable = options.enabled ?? Boolean(path);
  const { data, isLoading, error } = useQuery<PreviewInfo>({
    queryKey: ["image-preview", path],
    queryFn: async () => {
      if (!path) {
        throw new Error("No image path provided");
      }
      const result = await api.image.preparePreview(path);

      return result;
    },
    enabled: shouldEnable,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const errorMessage =
    error instanceof Error ? error.message : error ? String(error) : null;

  return {
    preview: data,
    isLoading,
    error: errorMessage,
  };
}
