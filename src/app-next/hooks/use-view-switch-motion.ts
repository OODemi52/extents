import { useLayoutEffect, useRef } from "react";

import { useLayoutStore } from "@/store/layout-store";

export function useViewSwitchMotion() {
  const layout = useLayoutStore((state) => state.activeLayout);
  const committedLayout = useRef(layout);
  const motionEnabled = committedLayout.current === layout;

  // Restoring a view's panels is immediate; explicit panel toggles still animate.
  useLayoutEffect(() => {
    committedLayout.current = layout;
  }, [layout]);

  return motionEnabled;
}
