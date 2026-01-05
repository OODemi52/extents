import { useRef, useCallback, useEffect } from "react";

import { useImageStore } from "@/store/image-store";

export function useScrubbing(settleDelay: number = 250) {
  const isScrubbing = useImageStore((state) => state.isScrubbing);
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
    if (!isScrubbing) {
      setIsScrubbing(true);
    }

    clearScrubTimeout();

    scrubTimeout.current = window.setTimeout(() => {
      scrubTimeout.current = null;
      setIsScrubbing(false);
    }, settleDelay);
  }, [isScrubbing, setIsScrubbing, clearScrubTimeout]);

  return { startScrubbing };
}
