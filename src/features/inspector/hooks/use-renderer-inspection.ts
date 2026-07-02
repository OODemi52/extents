import { useQuery } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useLayoutStore } from "@/store/layout-store";

export function useRendererInspection() {
  const activeLayout = useLayoutStore((state) => state.activeLayout);
  const inspectorEnabled = useLayoutStore((state) => state.inspectorEnabled);
  const isInspectorActive = inspectorEnabled && activeLayout === "inspector";

  const { data, error, isLoading } = useQuery({
    queryKey: ["renderer-inspection"],
    queryFn: () => api.renderer.getInspection(),
    enabled: isInspectorActive,
    refetchInterval: isInspectorActive ? 500 : false,
  });

  const errorMessage =
    error instanceof Error ? error.message : error ? String(error) : null;

  return {
    snapshot: data ?? null,
    isLoading,
    error: errorMessage,
  };
}
