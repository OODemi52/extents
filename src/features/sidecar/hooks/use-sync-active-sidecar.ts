import { useEffect } from "react";

import { useActiveSidecarStore } from "../store/active-sidecar-store";

import { api } from "@/services/api";

export function useSyncActiveSidecar() {
  const exposureEv = useActiveSidecarStore(
    (state) => state.sidecar?.recipe.exposure_ev ?? null,
  );

  useEffect(() => {
    if (exposureEv === null) {
      return;
    }

    api.adjustments
      .updateExposure({ exposureEv })
      .catch((error) =>
        console.error("[active-sidecar] Failed to sync exposure:", error),
      );
  }, [exposureEv]);
}
