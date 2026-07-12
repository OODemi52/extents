import { useEffect, useRef, useCallback, useState } from "react";

import { api, type PreviewInfo } from "@/services/api";

const VIEWPORT_DEBOUNCE_MS = 100;
const FULL_DECODE_DEBOUNCE_MS = 150;
const MIN_VIEWPORT_CSS_SIZE = 32;

// There is one WGPU renderer, but multiple mounted React viewports can point at it.
// Track the renderer's current source image so view switches can reuse it.
let currentRendererImagePath: string | null = null;

type RendererViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function measureRendererViewport(
  viewportElement: HTMLDivElement | null,
): RendererViewport | null {
  if (!viewportElement) {
    return null;
  }

  const clientViewportDimensions = viewportElement.getBoundingClientRect();

  if (
    !Number.isFinite(clientViewportDimensions.width) ||
    !Number.isFinite(clientViewportDimensions.height) ||
    clientViewportDimensions.width < MIN_VIEWPORT_CSS_SIZE ||
    clientViewportDimensions.height < MIN_VIEWPORT_CSS_SIZE
  ) {
    return null;
  }

  const devicePixelRatio = window.devicePixelRatio || 1;

  return {
    x: clientViewportDimensions.x * devicePixelRatio,
    y: clientViewportDimensions.y * devicePixelRatio,
    width: clientViewportDimensions.width * devicePixelRatio,
    height: clientViewportDimensions.height * devicePixelRatio,
  };
}

export function useViewportSync(
  viewportRef: React.RefObject<HTMLDivElement>,
  preview: PreviewInfo | undefined,
  thumbnailPath: string | null,
  imagePath: string | null,
  isScrubbing: boolean,
  isActive: boolean,
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  const lastLoadKeyRef = useRef<string | null>(null);
  const lastSwapPathRef = useRef<string | null>(null);
  const activeImagePathRef = useRef<string | null>(null);
  const [requestId, setRequestId] = useState<number | null>(null);
  const pendingFullRequestRef = useRef<{
    path: string;
    requestId: number;
  } | null>(null);
  const viewportTimeoutRef = useRef<number | null>(null);
  const transformTimeoutRef = useRef<number | null>(null);
  const fullDecodeTimeoutRef = useRef<number | null>(null);
  const lastTransformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const isActiveRef = useRef(isActive);
  const [isViewportReady, setIsViewportReady] = useState(false);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const updateViewportReadiness = useCallback(
    (width: number, height: number) => {
      const isReady =
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width >= MIN_VIEWPORT_CSS_SIZE &&
        height >= MIN_VIEWPORT_CSS_SIZE;

      setIsViewportReady(isReady);
    },
    [],
  );

  const syncRendererViewport = useCallback(() => {
    if (!isActive) return;

    const viewport = measureRendererViewport(viewportRef.current);

    if (!viewport) return;

    api.renderer
      .syncViewport(viewport)
      .catch((error) =>
        console.error("[useViewportSync] update_viewport failed:", error),
      );
  }, [isActive, viewportRef]);

  const scheduleRendererViewportSync = useCallback(() => {
    if (!isActive) return;

    if (viewportTimeoutRef.current !== null) {
      clearTimeout(viewportTimeoutRef.current);
    }

    viewportTimeoutRef.current = window.setTimeout(() => {
      viewportTimeoutRef.current = null;
      syncRendererViewport();
    }, VIEWPORT_DEBOUNCE_MS);
  }, [isActive, syncRendererViewport]);

  useEffect(() => {
    if (isActive) return;

    setRequestId(null);
    setIsViewportReady(false);

    if (viewportTimeoutRef.current !== null) {
      clearTimeout(viewportTimeoutRef.current);
      viewportTimeoutRef.current = null;
    }

    if (transformTimeoutRef.current !== null) {
      cancelAnimationFrame(transformTimeoutRef.current);
      transformTimeoutRef.current = null;
    }

    if (fullDecodeTimeoutRef.current !== null) {
      clearTimeout(fullDecodeTimeoutRef.current);
      fullDecodeTimeoutRef.current = null;
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !isViewportReady) return;

    if (!viewportRef.current || !imagePath) {
      lastLoadKeyRef.current = null;
      lastSwapPathRef.current = null;
      activeImagePathRef.current = null;
      setRequestId(null);
      pendingFullRequestRef.current = null;
      currentRendererImagePath = null;
      void api.renderer.clearRenderer();

      return;
    }

    const proxyPath = thumbnailPath ?? preview?.path ?? null;
    const loadKey = `${imagePath}|${proxyPath || "none"}`;

    if (
      lastLoadKeyRef.current === loadKey ||
      currentRendererImagePath === imagePath
    ) {
      lastLoadKeyRef.current = loadKey;
      activeImagePathRef.current = imagePath;
      syncRendererViewport();

      return;
    }

    lastLoadKeyRef.current = loadKey;
    lastSwapPathRef.current = null;
    activeImagePathRef.current = imagePath;
    setRequestId(null);
    pendingFullRequestRef.current = null;

    if (proxyPath) {
      lastSwapPathRef.current = proxyPath;
    }

    const shouldDeferFull = isScrubbing;

    let rafId: number | null = null;

    rafId = window.requestAnimationFrame(() => {
      const viewport = measureRendererViewport(viewportRef.current);

      if (!viewport) {
        if (activeImagePathRef.current === imagePath) {
          lastLoadKeyRef.current = null;
        }

        return;
      }

      currentRendererImagePath = imagePath;

      api.renderer
        .loadImage({
          path: imagePath,
          previewPath: proxyPath,
          viewportX: viewport.x,
          viewportY: viewport.y,
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
          deferFullImageLoad: shouldDeferFull,
        })
        .then((nextRequestId) => {
          if (
            !isActiveRef.current ||
            activeImagePathRef.current !== imagePath
          ) {
            return;
          }

          setRequestId(nextRequestId);
          syncRendererViewport();

          if (shouldDeferFull) {
            pendingFullRequestRef.current = {
              path: imagePath,
              requestId: nextRequestId,
            };
          }
        })
        .catch((error) => {
          if (currentRendererImagePath === imagePath) {
            currentRendererImagePath = null;
          }

          console.error("[ViewportSync] load_image failed:", error);
        });
    });

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [
    imagePath,
    viewportRef,
    isScrubbing,
    thumbnailPath,
    preview?.path,
    isViewportReady,
    isActive,
    syncRendererViewport,
  ]);

  // Scrubbing / full decode
  useEffect(() => {
    if (fullDecodeTimeoutRef.current !== null) {
      clearTimeout(fullDecodeTimeoutRef.current);

      fullDecodeTimeoutRef.current = null;
    }

    if (!isActive) return;
    if (isScrubbing) return;

    fullDecodeTimeoutRef.current = window.setTimeout(() => {
      const pending = pendingFullRequestRef.current;

      if (!pending) return;

      if (activeImagePathRef.current !== pending.path) {
        pendingFullRequestRef.current = null;

        return;
      }

      pendingFullRequestRef.current = null;

      api.renderer
        .startFullImageLoad({
          path: pending.path,
          requestId: pending.requestId,
        })
        .catch((error) =>
          console.error(
            "[useViewportSync] start_full_image_load failed:",
            error,
          ),
        );
    }, FULL_DECODE_DEBOUNCE_MS);

    return () => {
      if (fullDecodeTimeoutRef.current !== null) {
        clearTimeout(fullDecodeTimeoutRef.current);

        fullDecodeTimeoutRef.current = null;
      }
    };
  }, [isScrubbing, isActive]);

  // Swapping Images (thumb -> preview)
  useEffect(() => {
    if (!isActive) return;
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
  }, [preview?.path, requestId, thumbnailPath, isActive]);

  // Resize Listeners
  useEffect(() => {
    if (!isActive) return;

    const viewportElement = viewportRef.current;

    if (!viewportElement) return;

    let animationFrameId: number | null = null;

    const syncMeasuredViewport = () => {
      const clientViewportDimensions = viewportElement.getBoundingClientRect();

      updateViewportReadiness(
        clientViewportDimensions.width,
        clientViewportDimensions.height,
      );

      scheduleRendererViewportSync();
    };

    const scheduleViewportMeasurement = () => {
      if (animationFrameId !== null) return;

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        syncMeasuredViewport();
      });
    };

    const resizeObserver = new ResizeObserver(scheduleViewportMeasurement);

    resizeObserver.observe(viewportElement);
    window.addEventListener("resize", scheduleViewportMeasurement);
    scheduleViewportMeasurement();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleViewportMeasurement);

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      if (viewportTimeoutRef.current !== null) {
        clearTimeout(viewportTimeoutRef.current);

        viewportTimeoutRef.current = null;
      }
    };
  }, [
    updateViewportReadiness,
    scheduleRendererViewportSync,
    viewportRef,
    isActive,
  ]);

  // Image Transform
  useEffect(() => {
    if (!isActive) return;
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
  }, [scale, offsetX, offsetY, preview, isActive]);
}
