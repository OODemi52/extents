import { useCallback } from "react";

import { useActiveSidecarStore } from "@/features/sidecar/store/active-sidecar-store";

export function useExposureAdjustment() {
  const sidecar = useActiveSidecarStore((state) => state.sidecar);
  const setSidecar = useActiveSidecarStore((state) => state.setSidecar);
  const exposureEv = sidecar?.recipe.exposure_ev ?? 0;

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
