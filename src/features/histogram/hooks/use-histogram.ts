import { useQuery } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useImageStore } from "@/store/image-store";

export function useHistogram() {
  const { files, selectedIndex } = useImageStore();
  const selected = selectedIndex !== null ? files[selectedIndex] : null;
  const path = selected?.path ?? null;

  const { data, isLoading, error } = useQuery({
    queryKey: ["histogram", path],
    queryFn: async () => {
      if (!path) {
        throw new Error("No image selected");
      }

      return api.image.getHistogram(path);
    },
    enabled: Boolean(path),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const errorMessage =
    error instanceof Error ? error.message : error ? String(error) : null;

  return {
    histogram: data ?? null,
    isLoading,
    error: errorMessage,
  };
}
