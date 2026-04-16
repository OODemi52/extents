import { useLoadActiveSidecar } from "./use-load-active-sidecar";
import { useSaveActiveSidecar } from "./use-save-active-sidecar";
import { useSyncActiveSidecar } from "./use-sync-active-sidecar";

export function useActiveSidecar() {
  const { flushSidecar } = useSaveActiveSidecar();

  useLoadActiveSidecar({ flushSidecar });
  useSyncActiveSidecar();
}
