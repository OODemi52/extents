import { useEffect, useRef } from "react";

import { useActiveSidecarStore } from "../store/active-sidecar-store";

import { api } from "@/services/api";
import { useImageStore } from "@/store/image-store";

type UseLoadActiveSidecarOptions = {
  flushSidecar: () => Promise<void>;
};

export function useLoadActiveSidecar({
  flushSidecar,
}: UseLoadActiveSidecarOptions) {
  const selectedImagePath = useImageStore((state) => {
    if (state.selectedIndex === null) {
      return null;
    }

    return state.files[state.selectedIndex]?.path ?? null;
  });
  const hydrateSidecar = useActiveSidecarStore((state) => state.hydrateSidecar);
  const clearSidecar = useActiveSidecarStore((state) => state.clearSidecar);
  const loadRequestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const loadSelectedSidecar = async () => {
      const currentState = useActiveSidecarStore.getState();

      if (
        currentState.imagePath === selectedImagePath &&
        currentState.sidecar !== null
      ) {
        return;
      }

      await flushSidecar();

      if (!selectedImagePath) {
        clearSidecar();

        return;
      }

      const requestId = loadRequestIdRef.current + 1;

      loadRequestIdRef.current = requestId;

      try {
        const sidecar = await api.sidecar.loadSidecar({
          path: selectedImagePath,
        });

        if (cancelled || loadRequestIdRef.current !== requestId) {
          return;
        }

        hydrateSidecar(selectedImagePath, sidecar);
      } catch (error) {
        if (cancelled || loadRequestIdRef.current !== requestId) {
          return;
        }

        console.error("[active-sidecar] Failed to load sidecar:", error);
        clearSidecar();
      }
    };

    void loadSelectedSidecar();

    return () => {
      cancelled = true;
    };
  }, [clearSidecar, flushSidecar, hydrateSidecar, selectedImagePath]);
}
