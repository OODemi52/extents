import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "@/services/api";

type UseImagePreviewOptions = {
  enabled?: boolean;
};

export const imagePreviewQueryOptions = (path: string | null) =>
  queryOptions({
    queryKey: ["image-preview", path] as const,
    queryFn: async () => {
      if (!path) {
        throw new Error("No image path provided");
      }

      return api.image.preparePreview({ path });
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

export function useImagePreview(
  path: string | null,
  options: UseImagePreviewOptions = {},
) {
  const shouldEnable = options.enabled ?? Boolean(path);
  const { data, isLoading, error } = useQuery({
    ...imagePreviewQueryOptions(path),
    enabled: shouldEnable,
  });

  const errorMessage =
    error instanceof Error ? error.message : error ? String(error) : null;

  return {
    preview: data,
    isLoading,
    error: errorMessage,
  };
}
