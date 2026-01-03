import type { PreviewInfo } from "@/services/api/image";

import { useEffect, useRef, useCallback, useState } from "react";

import { api } from "@/services/api";

const VIEWPORT_DEBOUNCE_MS = 100;
const SCRUB_THRESHOLD_MS = 120;
const FULL_DECODE_DEBOUNCE_MS = 180;

export function useViewportSync(
  viewportRef: React.RefObject<HTMLDivElement>,
  preview: PreviewInfo | undefined,
  thumbnailPath: string | null,
  imagePath: string | null,
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  const lastLoadKeyRef = useRef<string | null>(null);
  const lastSwapPathRef = useRef<string | null>(null);
  const activeImagePathRef = useRef<string | null>(null);
  const [requestId, setRequestId] = useState<number | null>(null);
  const fullDecodeTimerRef = useRef<number | null>(null);
  const lastSelectionTimeRef = useRef<number | null>(null);
  const isScrubbingRef = useRef(false);
  const viewportTimeoutRef = useRef<number | null>(null);
  const transformTimeoutRef = useRef<number | null>(null);
  const lastTransformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });

  const updateViewport = useCallback(() => {
    if (!viewportRef.current) {
      return;
    }

    if (viewportTimeoutRef.current !== null) {
      clearTimeout(viewportTimeoutRef.current);
    }

    viewportTimeoutRef.current = window.setTimeout(() => {
      if (!viewportRef.current) return;

      const clientViewportDimensions =
        viewportRef.current.getBoundingClientRect();

      const devicePixelRatio = window.devicePixelRatio;

      api.renderer
        .syncViewport({
          x: clientViewportDimensions.x * devicePixelRatio,
          y: clientViewportDimensions.y * devicePixelRatio,
          width: clientViewportDimensions.width * devicePixelRatio,
          height: clientViewportDimensions.height * devicePixelRatio,
        })
        .catch((error) =>
          console.error("[useViewportSync] update_viewport failed:", error),
        );
    }, VIEWPORT_DEBOUNCE_MS);
  }, [viewportRef]);

  useEffect(() => {
    if (!viewportRef.current || !imagePath) {
      lastLoadKeyRef.current = null;
      lastSwapPathRef.current = null;
      activeImagePathRef.current = null;
      setRequestId(null);

      if (fullDecodeTimerRef.current !== null) {
        clearTimeout(fullDecodeTimerRef.current);
        fullDecodeTimerRef.current = null;
      }

      return;
    }

    if (lastLoadKeyRef.current === imagePath) return;

    lastLoadKeyRef.current = imagePath;
    lastSwapPathRef.current = null;
    activeImagePathRef.current = imagePath;
    setRequestId(null);

    if (fullDecodeTimerRef.current !== null) {
      clearTimeout(fullDecodeTimerRef.current);
      fullDecodeTimerRef.current = null;
    }

    const now = Date.now();
    const lastSelectionTime = lastSelectionTimeRef.current;
    const isScrubbing =
      lastSelectionTime !== null &&
      now - lastSelectionTime < SCRUB_THRESHOLD_MS;

    lastSelectionTimeRef.current = now;
    isScrubbingRef.current = isScrubbing;

    const clientViewportDimensions =
      viewportRef.current.getBoundingClientRect();

    const devicePixelRatio = window.devicePixelRatio;
    const proxyPath = thumbnailPath ?? preview?.path ?? null;

    if (proxyPath) {
      lastSwapPathRef.current = proxyPath;
    }

    const shouldDeferFull = Boolean(proxyPath) && isScrubbing;

    let rafId: number | null = null;

    rafId = window.requestAnimationFrame(() => {
      api.renderer
        .loadImage({
          path: imagePath,
          previewPath: proxyPath,
          viewportX: clientViewportDimensions.x * devicePixelRatio,
          viewportY: clientViewportDimensions.y * devicePixelRatio,
          viewportWidth: clientViewportDimensions.width * devicePixelRatio,
          viewportHeight: clientViewportDimensions.height * devicePixelRatio,
          deferFull: shouldDeferFull,
        })
        .then((nextRequestId) => {
          if (activeImagePathRef.current !== imagePath) {
            return;
          }

          setRequestId(nextRequestId);
          updateViewport();

          if (shouldDeferFull) {
            if (fullDecodeTimerRef.current !== null) {
              clearTimeout(fullDecodeTimerRef.current);
            }

            fullDecodeTimerRef.current = window.setTimeout(() => {
              fullDecodeTimerRef.current = null;

              if (activeImagePathRef.current !== imagePath) {
                return;
              }

              api.renderer
                .startFullImageLoad({
                  path: imagePath,
                  requestId: nextRequestId,
                })
                .catch((error) =>
                  console.error(
                    "[useViewportSync] start_full_image_load failed:",
                    error,
                  ),
                );
            }, FULL_DECODE_DEBOUNCE_MS);
          }
        })
        .catch((error) =>
          console.error("[useViewportSync] load_image failed:", error),
        );
    });

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      if (fullDecodeTimerRef.current !== null) {
        clearTimeout(fullDecodeTimerRef.current);
        fullDecodeTimerRef.current = null;
      }
    };
  }, [imagePath, preview?.path, thumbnailPath, viewportRef, updateViewport]);

  useEffect(() => {
    if (!requestId) return;

    const proxyPath = preview?.path ?? thumbnailPath;

    if (!proxyPath) return;
    if (lastSwapPathRef.current === proxyPath) return;

    lastSwapPathRef.current = proxyPath;

    api.renderer
      .swapRequestedTexture({ path: proxyPath, requestId })
      .catch((error) =>
        console.error(
          "[useViewportSync] swap_requested_texture failed:",
          error,
        ),
      );
  }, [preview?.path, requestId, thumbnailPath]);

  useEffect(() => {
    if (!viewportRef.current) return;

    const handleWindowResize = () => {
      updateViewport();
    };

    window.addEventListener("resize", handleWindowResize);

    updateViewport();

    return () => {
      window.removeEventListener("resize", handleWindowResize);

      if (viewportTimeoutRef.current !== null) {
        clearTimeout(viewportTimeoutRef.current);
      }
    };
  }, [updateViewport, viewportRef]);

  useEffect(() => {
    if (!preview) return;

    const lastTransform = lastTransformRef.current;

    if (
      lastTransform.scale === scale &&
      lastTransform.offsetX === offsetX &&
      lastTransform.offsetY === offsetY
    ) {
      return;
    }

    if (transformTimeoutRef.current !== null) {
      cancelAnimationFrame(transformTimeoutRef.current);
    }

    transformTimeoutRef.current = requestAnimationFrame(() => {
      lastTransformRef.current = { scale, offsetX, offsetY };

      api.renderer
        .updateTransform({ scale, offsetX, offsetY })
        .catch((error) =>
          console.error("[useViewportSync] update_transform failed:", error),
        );
    });

    return () => {
      if (transformTimeoutRef.current !== null) {
        cancelAnimationFrame(transformTimeoutRef.current);
      }
    };
  }, [scale, offsetX, offsetY, preview]);
}
