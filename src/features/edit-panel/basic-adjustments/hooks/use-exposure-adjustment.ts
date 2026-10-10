import { useCallback, useRef } from "react";

import { useActiveSidecarStore } from "@/features/sidecar/store/active-sidecar-store";

export function useExposureAdjustment(active = true) {
  const retainedSidecarRef = useRef(useActiveSidecarStore.getState().sidecar);
  const sidecar = useActiveSidecarStore((state) =>
    active ? state.sidecar : retainedSidecarRef.current,
  );
  const setSidecar = useActiveSidecarStore((state) => state.setSidecar);
  const exposureEv = sidecar?.recipe.exposure_ev ?? 0;

  if (active) {
    retainedSidecarRef.current = sidecar;
  }

  const setExposure = useCallback(
    (nextExposureEv: number) => {
      if (!sidecar) {
        return;
      }

      setSidecar({
        ...sidecar,
        recipe: {
          ...sidecar.recipe,
          exposure_ev: nextExposureEv,
        },
      });
    },
    [setSidecar, sidecar],
  );

  return {
    exposureEv,
    setExposure,
  };
}
