import { useSyncExternalStore } from "react";

const MIN_WORKSPACE_WIDTH = 180;

const subscribe = (listener: () => void) => {
  window.addEventListener("resize", listener);

  return () => window.removeEventListener("resize", listener);
};

const getViewportWidth = () => window.innerWidth;

export function usePanelWidthLimit(maxWidth: number, minWidth: number) {
  // Window resizing changes the budget; panel animations do not.
  const viewportWidth = useSyncExternalStore(subscribe, getViewportWidth);
  const budget = Math.floor((viewportWidth - MIN_WORKSPACE_WIDTH) / 2);

  return Math.min(maxWidth, Math.max(minWidth, budget));
}
