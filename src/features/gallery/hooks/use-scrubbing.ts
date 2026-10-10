import { useRef, useCallback, useEffect } from "react";

import { useImageStore } from "@/store/image-store";

export function useScrubbing(settleDelay: number = 250) {
  const setIsScrubbing = useImageStore((state) => state.setIsScrubbing);
  const scrubTimeout = useRef<number | null>(null);

  const clearScrubTimeout = useCallback(() => {
    if (scrubTimeout.current !== null) {
      clearTimeout(scrubTimeout.current);
      scrubTimeout.current = null;
    }
  }, []);

  useEffect(() => {
    return clearScrubTimeout;
  }, [clearScrubTimeout]);

  const startScrubbing = useCallback(() => {
    if (!useImageStore.getState().isScrubbing) {
      setIsScrubbing(true);
    }

    clearScrubTimeout();

    scrubTimeout.current = window.setTimeout(() => {
      scrubTimeout.current = null;
      setIsScrubbing(false);
    }, settleDelay);
  }, [setIsScrubbing, clearScrubTimeout, settleDelay]);

  return { startScrubbing };
}
