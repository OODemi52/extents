import type {
  ImageTransform,
  ImageTransformMode,
} from "@/store/transform-store";

import { useEffect, useRef, useCallback, useState } from "react";

import { api, type PreviewInfo } from "@/services/api";
import { FIT_IMAGE_TRANSFORM } from "@/types/image-transform";

const FULL_DECODE_DEBOUNCE_MS = 150;
const MIN_VIEWPORT_CSS_SIZE = 32;
const VIEWPORT_TRANSFORM_COMMIT_DELAY_MS = 120;

// There is one WGPU renderer, but multiple mounted React viewports can point at it.
// Track the renderer's current source image so view switches can reuse it.
let currentRendererImagePath: string | null = null;

type RendererViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type RendererViewportRequest = {
  transform?: ImageTransform;
  viewport: RendererViewport;
};

function transformsMatch(left: ImageTransform, right: ImageTransform) {
  return (
    left.scale === right.scale &&
    left.offsetX === right.offsetX &&
    left.offsetY === right.offsetY
  );
}

function preservePresentedTransform(
  transform: ImageTransform,
  previousViewport: RendererViewport,
  nextViewport: RendererViewport,
  imageDimensions: { width: number; height: number },
): ImageTransform {
  const previousFitScale = Math.min(
    previousViewport.width / imageDimensions.width,
    previousViewport.height / imageDimensions.height,
  );
  const nextFitScale = Math.min(
    nextViewport.width / imageDimensions.width,
    nextViewport.height / imageDimensions.height,
  );

  if (
    !Number.isFinite(previousFitScale) ||
    !Number.isFinite(nextFitScale) ||
    previousFitScale <= 0 ||
    nextFitScale <= 0
  ) {
    return transform;
  }

  return {
    scale: transform.scale * (previousFitScale / nextFitScale),
    offsetX:
      ((previousViewport.x +
        previousViewport.width / 2 +
        (transform.offsetX * previousViewport.width) / 2 -
        (nextViewport.x + nextViewport.width / 2)) *
        2) /
      nextViewport.width,
    offsetY:
      ((nextViewport.y +
        nextViewport.height / 2 -
        (previousViewport.y +
          previousViewport.height / 2 -
          (transform.offsetY * previousViewport.height) / 2)) *
        2) /
      nextViewport.height,
  };
}

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
  viewportRef: React.RefObject<HTMLDivElement | null>,
  preview: PreviewInfo | undefined,
  thumbnailPath: string | null,
  imagePath: string | null,
  isScrubbing: boolean,
  isActive: boolean,
  scale: number,
  offsetX: number,
  offsetY: number,
  mode: ImageTransformMode,
  commitTransform: (
    transform: ImageTransform,
    mode: ImageTransformMode,
  ) => void,
) {
  const lastLoadPathRef = useRef<string | null>(null);
  const lastSwapPathRef = useRef<string | null>(null);
  const activeImagePathRef = useRef<string | null>(null);
  const [requestId, setRequestId] = useState<number | null>(null);
  const pendingFullRequestRef = useRef<{
    path: string;
    requestId: number;
  } | null>(null);
  const viewportSyncFrameRef = useRef<number | null>(null);
  const viewportSyncInFlightRef = useRef(false);
  const pendingViewportRequestRef = useRef<RendererViewportRequest | null>(
    null,
  );
  const lastMeasuredViewportRef = useRef<RendererViewport | null>(null);
  const viewportTransformCommitTimerRef = useRef<number | null>(null);
  const pendingViewportTransformModeRef = useRef<ImageTransformMode | null>(
    null,
  );
  const transformFrameRef = useRef<number | null>(null);
  const pendingTransformRef = useRef<ImageTransform | null>(null);
  const fullDecodeTimeoutRef = useRef<number | null>(null);
  const lastTransformRef = useRef<ImageTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const currentTransformRef = useRef<ImageTransform>({
    scale,
    offsetX,
    offsetY,
  });
  const isActiveRef = useRef(isActive);
  const modeRef = useRef(mode);
  const commitTransformRef = useRef(commitTransform);
  const previewDimensionsRef = useRef<{
    width: number;
    height: number;
  } | null>(preview ? { width: preview.width, height: preview.height } : null);
  const hasPreviewRef = useRef(Boolean(preview));
  const [isViewportReady, setIsViewportReady] = useState(false);

  isActiveRef.current = isActive;
  modeRef.current = mode;
  commitTransformRef.current = commitTransform;
  previewDimensionsRef.current = preview
    ? { width: preview.width, height: preview.height }
    : null;
  hasPreviewRef.current = Boolean(preview);

  const flushRendererTransform = useCallback(() => {
    transformFrameRef.current = null;

    const transform = pendingTransformRef.current;

    pendingTransformRef.current = null;

    if (!transform || !isActiveRef.current || !hasPreviewRef.current) return;
    if (transformsMatch(lastTransformRef.current, transform)) return;

    lastTransformRef.current = transform;

    api.renderer
      .updateTransform(transform)
      .catch((error) =>
        console.error("[useViewportSync] update_transform failed:", error),
      );
  }, []);

  const updateRendererTransform = useCallback(
    (transform: ImageTransform) => {
      currentTransformRef.current = transform;
      pendingTransformRef.current = transform;

      if (!isActiveRef.current || !hasPreviewRef.current) return;
      if (transformFrameRef.current !== null) return;

      transformFrameRef.current = window.requestAnimationFrame(
        flushRendererTransform,
      );
    },
    [flushRendererTransform],
  );

  const getRendererTransform = useCallback(
    () => currentTransformRef.current,
    [],
  );

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

  const flushRendererViewport = useCallback(
    function flushRendererViewportRequest() {
      viewportSyncFrameRef.current = null;

      if (viewportSyncInFlightRef.current || !isActiveRef.current) return;

      const request = pendingViewportRequestRef.current;

      pendingViewportRequestRef.current = null;

      if (!request) return;

      viewportSyncInFlightRef.current = true;

      const operation = request.transform
        ? api.renderer.resumePresentation({
            ...request.viewport,
            scale: request.transform.scale,
            offsetX: request.transform.offsetX,
            offsetY: request.transform.offsetY,
          })
        : api.renderer.syncViewport(request.viewport);

      if (request.transform) {
        lastTransformRef.current = request.transform;
      }

      void operation
        .catch((error) =>
          console.error("[useViewportSync] update_viewport failed:", error),
        )
        .finally(() => {
          viewportSyncInFlightRef.current = false;

          if (
            pendingViewportRequestRef.current &&
            isActiveRef.current &&
            viewportSyncFrameRef.current === null
          ) {
            viewportSyncFrameRef.current = window.requestAnimationFrame(
              flushRendererViewportRequest,
            );
          }
        });
    },
    [],
  );

  const queueRendererViewport = useCallback(
    (request: RendererViewportRequest) => {
      pendingViewportRequestRef.current = request;

      if (
        !isActiveRef.current ||
        viewportSyncInFlightRef.current ||
        viewportSyncFrameRef.current !== null
      ) {
        return;
      }

      viewportSyncFrameRef.current = window.requestAnimationFrame(
        flushRendererViewport,
      );
    },
    [flushRendererViewport],
  );

  const commitPendingViewportTransform = useCallback(() => {
    if (viewportTransformCommitTimerRef.current !== null) {
      window.clearTimeout(viewportTransformCommitTimerRef.current);
      viewportTransformCommitTimerRef.current = null;
    }

    const pendingMode = pendingViewportTransformModeRef.current;

    pendingViewportTransformModeRef.current = null;

    if (!pendingMode || modeRef.current !== pendingMode) return;

    commitTransformRef.current(currentTransformRef.current, pendingMode);
  }, []);

  const scheduleViewportTransformCommit = useCallback(
    (transformMode: ImageTransformMode) => {
      pendingViewportTransformModeRef.current = transformMode;

      if (viewportTransformCommitTimerRef.current !== null) {
        window.clearTimeout(viewportTransformCommitTimerRef.current);
      }

      viewportTransformCommitTimerRef.current = window.setTimeout(() => {
        commitPendingViewportTransform();
      }, VIEWPORT_TRANSFORM_COMMIT_DELAY_MS);
    },
    [commitPendingViewportTransform],
  );

  const applyViewportTransform = useCallback((transform: ImageTransform) => {
    currentTransformRef.current = transform;
    pendingTransformRef.current = null;

    if (transformFrameRef.current !== null) {
      window.cancelAnimationFrame(transformFrameRef.current);
      transformFrameRef.current = null;
    }
  }, []);

  const syncRendererViewport = useCallback(() => {
    if (!isActiveRef.current) return;

    const viewport = measureRendererViewport(viewportRef.current);

    if (!viewport) return;

    const previousViewport = lastMeasuredViewportRef.current;

    lastMeasuredViewportRef.current = viewport;

    if (!previousViewport) {
      queueRendererViewport({ viewport });

      return;
    }

    const widthChanged = previousViewport.width !== viewport.width;
    const heightChanged = previousViewport.height !== viewport.height;
    const shouldPreservePresentation = modeRef.current === "manual";

    if (!shouldPreservePresentation) {
      if (
        modeRef.current === "fit" &&
        !transformsMatch(currentTransformRef.current, FIT_IMAGE_TRANSFORM)
      ) {
        applyViewportTransform(FIT_IMAGE_TRANSFORM);
        queueRendererViewport({
          transform: FIT_IMAGE_TRANSFORM,
          viewport,
        });
        commitTransformRef.current(FIT_IMAGE_TRANSFORM, "fit");

        return;
      }

      queueRendererViewport({ viewport });

      return;
    }

    const imageDimensions = previewDimensionsRef.current;
    const transform = imageDimensions
      ? preservePresentedTransform(
          currentTransformRef.current,
          previousViewport,
          viewport,
          imageDimensions,
        )
      : currentTransformRef.current;

    applyViewportTransform(transform);
    queueRendererViewport({ transform, viewport });

    if (widthChanged || heightChanged) {
      scheduleViewportTransformCommit(modeRef.current);
    }
  }, [
    applyViewportTransform,
    queueRendererViewport,
    scheduleViewportTransformCommit,
    viewportRef,
  ]);

  const resumeRendererPresentation = useCallback(() => {
    if (!isActive) return;

    const viewport = measureRendererViewport(viewportRef.current);

    if (!viewport) return;

    const transform = currentTransformRef.current;

    api.renderer
      .resumePresentation({
        ...viewport,
        scale: transform.scale,
        offsetX: transform.offsetX,
        offsetY: transform.offsetY,
      })
      .catch((error) =>
        console.error(
          "[useViewportSync] resume_renderer_presentation failed:",
          error,
        ),
      );
  }, [isActive, viewportRef]);

  const scheduleRendererViewportSync = syncRendererViewport;

  useEffect(() => {
    if (isActive) return;

    setRequestId(null);
    setIsViewportReady(false);

    if (viewportSyncFrameRef.current !== null) {
      cancelAnimationFrame(viewportSyncFrameRef.current);
      viewportSyncFrameRef.current = null;
    }
    pendingViewportRequestRef.current = null;

    if (viewportTransformCommitTimerRef.current !== null) {
      commitPendingViewportTransform();
    }

    if (transformFrameRef.current !== null) {
      cancelAnimationFrame(transformFrameRef.current);
      transformFrameRef.current = null;
    }
    pendingTransformRef.current = null;

    if (fullDecodeTimeoutRef.current !== null) {
      clearTimeout(fullDecodeTimeoutRef.current);
      fullDecodeTimeoutRef.current = null;
    }
  }, [commitPendingViewportTransform, isActive]);

  useEffect(() => {
    if (!isActive || !isViewportReady) return;

    if (!viewportRef.current || !imagePath) {
      lastLoadPathRef.current = null;
      lastSwapPathRef.current = null;
      activeImagePathRef.current = null;
      setRequestId(null);
      pendingFullRequestRef.current = null;
      currentRendererImagePath = null;
      void api.renderer.clearRenderer();

      return;
    }

    const viewport = measureRendererViewport(viewportRef.current);

    if (!viewport) return;

    const proxyPath = thumbnailPath ?? preview?.path ?? null;

    if (
      lastLoadPathRef.current === imagePath ||
      currentRendererImagePath === imagePath
    ) {
      lastLoadPathRef.current = imagePath;
      activeImagePathRef.current = imagePath;
      resumeRendererPresentation();

      return;
    }

    lastLoadPathRef.current = imagePath;
    lastSwapPathRef.current = null;
    activeImagePathRef.current = imagePath;
    setRequestId(null);
    pendingFullRequestRef.current = null;

    if (proxyPath) {
      lastSwapPathRef.current = proxyPath;
    }

    const shouldDeferFull = isScrubbing;

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
        if (!isActiveRef.current || activeImagePathRef.current !== imagePath) {
          return;
        }

        setRequestId(nextRequestId);
        resumeRendererPresentation();

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

        if (lastLoadPathRef.current === imagePath) {
          lastLoadPathRef.current = null;
        }

        console.error("[ViewportSync] load_image failed:", error);
      });
  }, [
    imagePath,
    viewportRef,
    isScrubbing,
    thumbnailPath,
    preview?.path,
    isViewportReady,
    isActive,
    resumeRendererPresentation,
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

      if (viewportSyncFrameRef.current !== null) {
        cancelAnimationFrame(viewportSyncFrameRef.current);
        viewportSyncFrameRef.current = null;
      }
      pendingViewportRequestRef.current = null;

      if (viewportTransformCommitTimerRef.current !== null) {
        commitPendingViewportTransform();
      }
    };
  }, [
    updateViewportReadiness,
    commitPendingViewportTransform,
    scheduleRendererViewportSync,
    viewportRef,
    isActive,
  ]);

  // Keep durable transform changes and direct manipulation on the same pipeline.
  useEffect(() => {
    updateRendererTransform({ scale, offsetX, offsetY });
  }, [offsetX, offsetY, scale, updateRendererTransform]);

  useEffect(() => {
    if (!isActive || !preview) return;

    updateRendererTransform(currentTransformRef.current);
  }, [isActive, preview, updateRendererTransform]);

  useEffect(
    () => () => {
      if (transformFrameRef.current !== null) {
        cancelAnimationFrame(transformFrameRef.current);
      }
    },
    [],
  );

  return {
    getTransform: getRendererTransform,
    updateTransform: updateRendererTransform,
  };
}
