import { useEffect, useRef, useCallback, useState } from "react";

import { api, type PreviewInfo } from "@/services/api";

const VIEWPORT_DEBOUNCE_MS = 100;
const FULL_DECODE_DEBOUNCE_MS = 150;
const MIN_VIEWPORT_CSS_SIZE = 32;

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
  const scrubbingRef = useRef(isScrubbing);
  const viewportTimeoutRef = useRef<number | null>(null);
  const transformTimeoutRef = useRef<number | null>(null);
  const fullDecodeTimeoutRef = useRef<number | null>(null);
  const lastTransformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const lastViewportSizeRef = useRef<{ width: number; height: number } | null>(
    null,
  );
  const [viewportRevision, setViewportRevision] = useState(0);

  const noteViewportSize = useCallback((width: number, height: number) => {
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width < MIN_VIEWPORT_CSS_SIZE ||
      height < MIN_VIEWPORT_CSS_SIZE
    ) {
      return;
    }

    const nextSize = {
      width: Math.round(width),
      height: Math.round(height),
    };

    const lastSize = lastViewportSizeRef.current;

    if (
      lastSize?.width === nextSize.width &&
      lastSize.height === nextSize.height
    ) {
      return;
    }

    lastViewportSizeRef.current = nextSize;
    setViewportRevision((revision) => revision + 1);
  }, []);

  const updateViewport = useCallback(() => {
    if (viewportTimeoutRef.current !== null) {
      clearTimeout(viewportTimeoutRef.current);
    }

    viewportTimeoutRef.current = window.setTimeout(() => {
      viewportTimeoutRef.current = null;

      const viewport = measureRendererViewport(viewportRef.current);

      if (!viewport) return;

      api.renderer
        .syncViewport(viewport)
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
      pendingFullRequestRef.current = null;
      void api.renderer.clearRenderer();

      return;
    }

    const proxyPath = thumbnailPath ?? preview?.path ?? null;
    const loadKey = `${imagePath}|${proxyPath || "none"}`;

    if (lastLoadKeyRef.current === loadKey) return;

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
          if (activeImagePathRef.current !== imagePath) return;

          setRequestId(nextRequestId);
          updateViewport();

          if (shouldDeferFull) {
            pendingFullRequestRef.current = {
              path: imagePath,
              requestId: nextRequestId,
            };
          }
        })
        .catch((error) => {
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
    updateViewport,
    isScrubbing,
    thumbnailPath,
    preview?.path,
    viewportRevision,
  ]);

  // Scrubbing / full decode
  useEffect(() => {
    scrubbingRef.current = isScrubbing;

    if (fullDecodeTimeoutRef.current !== null) {
      clearTimeout(fullDecodeTimeoutRef.current);

      fullDecodeTimeoutRef.current = null;
    }

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
  }, [isScrubbing]);

  // Swapping Images (thumb -> preview)
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

  // Resize Listeners
  useEffect(() => {
    const viewportElement = viewportRef.current;

    if (!viewportElement) return;

    let animationFrameId: number | null = null;

    const syncMeasuredViewport = () => {
      const clientViewportDimensions =
        viewportElement.getBoundingClientRect();

      noteViewportSize(
        clientViewportDimensions.width,
        clientViewportDimensions.height,
      );

      updateViewport();
    };

    const scheduleViewportSync = () => {
      if (animationFrameId !== null) return;

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        syncMeasuredViewport();
      });
    };

    const resizeObserver = new ResizeObserver(scheduleViewportSync);

    resizeObserver.observe(viewportElement);
    window.addEventListener("resize", scheduleViewportSync);
    scheduleViewportSync();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleViewportSync);

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      if (viewportTimeoutRef.current !== null) {
        clearTimeout(viewportTimeoutRef.current);

        viewportTimeoutRef.current = null;
      }
    };
  }, [noteViewportSize, updateViewport, viewportRef]);

  // Image Transform
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
