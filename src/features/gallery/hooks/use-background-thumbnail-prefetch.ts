import { useEffect, useRef, type RefObject } from "react";

import { usePrefetchThumbnails } from "./use-thumbnails";

const PREFETCH_DRIP_BATCH = 60;
const PREFETCH_DRIP_INTERVAL_MS = 1000;
const PREFETCH_DRIP_IDLE_MS = 400;

export function useBackgroundThumbnailPrefetch(
  paths: string[],
  scrollRef: RefObject<HTMLElement>,
  enabled = true,
) {
  const prefetchThumbnails = usePrefetchThumbnails();
  const cursorRef = useRef(0);
  const lastScrollRef = useRef(0);

  useEffect(() => {
    cursorRef.current = 0;
    lastScrollRef.current = Date.now();
  }, [paths]);

  useEffect(() => {
    if (!enabled) return;

    const element = scrollRef.current;

    if (!element) return;

    const handleScroll = () => {
      lastScrollRef.current = Date.now();
    };

    element.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, [scrollRef, enabled]);

  useEffect(() => {
    if (!enabled || paths.length === 0) return;

    let timer: number | null = null;

    const tick = () => {
      const now = Date.now();

      if (now - lastScrollRef.current < PREFETCH_DRIP_IDLE_MS) {
        timer = window.setTimeout(tick, PREFETCH_DRIP_INTERVAL_MS);
        return;
      }

      const start = cursorRef.current;

      if (start >= paths.length) {
        return;
      }

      const end = Math.min(paths.length, start + PREFETCH_DRIP_BATCH);

      prefetchThumbnails(paths.slice(start, end));

      cursorRef.current = end;

      timer = window.setTimeout(tick, PREFETCH_DRIP_INTERVAL_MS);
    };

    timer = window.setTimeout(tick, PREFETCH_DRIP_INTERVAL_MS);

    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [enabled, paths, prefetchThumbnails]);
}
