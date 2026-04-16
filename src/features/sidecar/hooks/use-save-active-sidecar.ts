import { useCallback, useEffect, useRef } from "react";

import { useActiveSidecarStore } from "../store/active-sidecar-store";

import { api } from "@/services/api";

const SIDE_CAR_SAVE_DEBOUNCE_MS = 750;

export function useSaveActiveSidecar() {
  const imagePath = useActiveSidecarStore((state) => state.imagePath);
  const sidecar = useActiveSidecarStore((state) => state.sidecar);
  const dirty = useActiveSidecarStore((state) => state.dirty);
  const saveTimeoutRef = useRef<number | null>(null);
  const flushRef = useRef<() => Promise<void>>(async () => {});

  flushRef.current = async () => {
    if (!imagePath || !sidecar || !dirty) {
      return;
    }

    const imagePathSnapshot = imagePath;
    const sidecarSnapshot = sidecar;

    try {
      await api.sidecar.saveSidecar({
        path: imagePathSnapshot,
        sidecar: sidecarSnapshot,
      });

      const currentState = useActiveSidecarStore.getState();

      if (
        currentState.imagePath === imagePathSnapshot &&
        currentState.sidecar === sidecarSnapshot
      ) {
        currentState.markClean();
      }
    } catch (error) {
      console.error("[active-sidecar] Failed to save sidecar:", error);
    }
  };

  const flushSidecar = useCallback(async () => {
    if (saveTimeoutRef.current !== null) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    await flushRef.current();
  }, []);

  useEffect(() => {
    if (!imagePath || !sidecar || !dirty) {
      return;
    }

    if (saveTimeoutRef.current !== null) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveTimeoutRef.current = null;
      void flushRef.current();
    }, SIDE_CAR_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [dirty, imagePath, sidecar]);

  useEffect(() => {
    return () => {
      void flushSidecar();
    };
  }, [flushSidecar]);

  return { flushSidecar };
}
