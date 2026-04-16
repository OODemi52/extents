import { useCallback } from "react";

import { useActiveSidecarStore } from "@/features/sidecar/store/active-sidecar-store";

export function useExposureAdjustment() {
  const sidecar = useActiveSidecarStore((state) => state.sidecar);
  const replaceSidecar = useActiveSidecarStore((state) => state.replaceSidecar);
  const exposureEv = sidecar?.recipe.exposure_ev ?? 0;

  const setExposure = useCallback(
    (nextExposureEv: number) => {
      if (!sidecar) {
        return;
      }

      replaceSidecar({
        ...sidecar,
        recipe: {
          ...sidecar.recipe,
          exposure_ev: nextExposureEv,
        },
      });
    },
    [replaceSidecar, sidecar],
  );

  return {
    exposureEv,
    setExposure,
  };
}
