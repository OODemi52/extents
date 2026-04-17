import { useEffect } from "react";

import { useActiveSidecarStore } from "../store/active-sidecar-store";

import { api } from "@/services/api";

export function useSyncActiveSidecar() {
  const sidecar = useActiveSidecarStore((state) => state.sidecar);

  useEffect(() => {
    if (sidecar === null) {
      return;
    }

    api.sidecar
      .syncSidecar({ sidecar })
      .catch((error) =>
        console.error("[active-sidecar] Failed to sync active sidecar:", error),
      );
  }, [sidecar]);
}
