import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useImageStore } from "@/store/image-store";

export function useHistogram(active = true) {
  const retainedPathRef = useRef<string | null>(null);
  const selectedPath = useImageStore((state) =>
    active && state.selectedIndex !== null
      ? (state.files[state.selectedIndex]?.path ?? null)
      : null,
  );
  const path = active ? selectedPath : retainedPathRef.current;

  if (active) {
    retainedPathRef.current = selectedPath;
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["histogram", path],
    queryFn: async () => {
      if (!path) {
        throw new Error("No image selected");
      }

      return api.image.getHistogram({ path });
    },
    enabled: active && Boolean(path),
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
