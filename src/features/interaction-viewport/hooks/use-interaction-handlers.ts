import type { RefObject } from "react";
import type {
  ImageTransform,
  ImageTransformMode,
} from "@/store/transform-store";

import { useCallback, useEffect, useRef } from "react";

import {
  CLICK_ZOOM_SCALE,
  FIT_SCALE,
  isFitScale,
  MAX_SCALE,
  MIN_SCALE,
} from "../constants";

const PAN_SPEED = 1.5;
const WHEEL_COMMIT_DELAY_MS = 120;
const CLICK_MOVEMENT_THRESHOLD_PX = 4;
const DISCRETE_ZOOM_DURATION_MS = 190;

type InteractionHandlersOptions = {
  commitTransform: (
    transform: ImageTransform,
    mode: ImageTransformMode,
  ) => void;
  enabled: boolean;
  getTransform: () => ImageTransform;
  imagePath: string | null;
  mode: ImageTransformMode;
  setMode: (mode: ImageTransformMode) => void;
  updateTransform: (transform: ImageTransform) => void;
};

type TransformAnimationOptions = {
  anchor?: { x: number; y: number };
};

function transformsMatch(left: ImageTransform, right: ImageTransform) {
  return (
    left.scale === right.scale &&
    left.offsetX === right.offsetX &&
    left.offsetY === right.offsetY
  );
}

function isZoomedIn(transform: ImageTransform) {
  return transform.scale > FIT_SCALE && !isFitScale(transform.scale);
}

function getIdleCursor(transform: ImageTransform) {
  return isZoomedIn(transform) ? "zoom-out" : "zoom-in";
}

function normalizeWheelDelta(
  delta: number,
  deltaMode: number,
  pageSize: number,
) {
  if (deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * 16;
  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) return delta * pageSize;

  return delta;
}

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

function interpolateTransform(
  from: ImageTransform,
  to: ImageTransform,
  progress: number,
  anchor?: { x: number; y: number },
): ImageTransform {
  const scale =
    from.scale > 0 && to.scale > 0
      ? from.scale * Math.pow(to.scale / from.scale, progress)
      : from.scale + (to.scale - from.scale) * progress;

  if (anchor) {
    const scaleFactor = scale / from.scale;

    return {
      scale,
      offsetX: anchor.x + (from.offsetX - anchor.x) * scaleFactor,
      offsetY: anchor.y + (from.offsetY - anchor.y) * scaleFactor,
    };
  }

  return {
    scale,
    offsetX: from.offsetX + (to.offsetX - from.offsetX) * progress,
    offsetY: from.offsetY + (to.offsetY - from.offsetY) * progress,
  };
}

export function useInteractionHandlers(
  viewportRef: RefObject<HTMLDivElement | null>,
  {
    commitTransform,
    enabled,
    getTransform,
    imagePath,
    mode,
    setMode,
    updateTransform,
  }: InteractionHandlersOptions,
) {
  const enabledRef = useRef(enabled);
  const imagePathRef = useRef(imagePath);
  const modeRef = useRef(mode);
  const isDraggingRef = useRef(false);
  const isHoveringRef = useRef(false);
  const interactionDirtyRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const dragViewportSizeRef = useRef<{ width: number; height: number } | null>(
    null,
  );
  const wheelCommitTimerRef = useRef<number | null>(null);
  const transformAnimationFrameRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  enabledRef.current = enabled;
  imagePathRef.current = imagePath;
  modeRef.current = mode;

  const clearWheelCommitTimer = useCallback(() => {
    if (wheelCommitTimerRef.current === null) return;

    window.clearTimeout(wheelCommitTimerRef.current);
    wheelCommitTimerRef.current = null;
  }, []);

  const commitPendingTransform = useCallback(() => {
    clearWheelCommitTimer();

    if (!interactionDirtyRef.current) return;

    interactionDirtyRef.current = false;
    commitTransform(getTransform(), modeRef.current);
  }, [clearWheelCommitTimer, commitTransform, getTransform]);

  const cancelPendingTransform = useCallback(() => {
    clearWheelCommitTimer();
    interactionDirtyRef.current = false;
  }, [clearWheelCommitTimer]);

  const applyLiveTransform = useCallback(
    (transform: ImageTransform) => {
      if (transformsMatch(getTransform(), transform)) return;

      interactionDirtyRef.current = true;
      updateTransform(transform);
    },
    [getTransform, updateTransform],
  );

  const setTransformMode = useCallback(
    (nextMode: ImageTransformMode) => {
      if (modeRef.current === nextMode) return;

      modeRef.current = nextMode;
      setMode(nextMode);
    },
    [setMode],
  );

  const cancelTransformAnimation = useCallback(() => {
    if (transformAnimationFrameRef.current === null) return;

    window.cancelAnimationFrame(transformAnimationFrameRef.current);
    transformAnimationFrameRef.current = null;
  }, []);

  const scheduleWheelCommit = useCallback(() => {
    clearWheelCommitTimer();

    wheelCommitTimerRef.current = window.setTimeout(() => {
      wheelCommitTimerRef.current = null;

      if (!enabledRef.current || !imagePathRef.current) return;

      commitPendingTransform();
    }, WHEEL_COMMIT_DELAY_MS);
  }, [clearWheelCommitTimer, commitPendingTransform]);

  const setCursor = useCallback(
    (cursor: string) => {
      const viewer = viewportRef.current;

      if (!viewer) return;
      viewer.style.cursor = enabledRef.current ? cursor : "";
    },
    [viewportRef],
  );

  const setGlobalCursor = useCallback((isActive: boolean) => {
    document.body.classList.toggle("cursor-grabbing", isActive);
  }, []);

  const setIdleCursor = useCallback(
    (transform = getTransform()) => {
      setCursor(getIdleCursor(transform));
    },
    [getTransform, setCursor],
  );

  const animateTransform = useCallback(
    (
      target: ImageTransform,
      targetMode: ImageTransformMode,
      options: TransformAnimationOptions = {},
    ) => {
      clearWheelCommitTimer();
      cancelTransformAnimation();
      setTransformMode(targetMode);

      const from = getTransform();

      if (transformsMatch(from, target)) {
        interactionDirtyRef.current = false;
        commitTransform(target, targetMode);
        setIdleCursor(target);

        return;
      }

      if (reducedMotionRef.current) {
        applyLiveTransform(target);
        commitPendingTransform();
        setIdleCursor(target);

        return;
      }

      const startedAt = performance.now();

      const tick = (timestamp: number) => {
        const linearProgress = Math.min(
          1,
          Math.max(0, (timestamp - startedAt) / DISCRETE_ZOOM_DURATION_MS),
        );
        const next = interpolateTransform(
          from,
          target,
          easeOutCubic(linearProgress),
          options.anchor,
        );

        applyLiveTransform(next);

        if (linearProgress < 1) {
          transformAnimationFrameRef.current =
            window.requestAnimationFrame(tick);

          return;
        }

        transformAnimationFrameRef.current = null;
        applyLiveTransform(target);
        commitPendingTransform();
        setIdleCursor(target);
      };

      setIdleCursor(target);
      transformAnimationFrameRef.current = window.requestAnimationFrame(tick);
    },
    [
      applyLiveTransform,
      cancelTransformAnimation,
      clearWheelCommitTimer,
      commitPendingTransform,
      commitTransform,
      getTransform,
      setIdleCursor,
      setTransformMode,
    ],
  );

  const resetPointerInteraction = useCallback(() => {
    const pointerId = activePointerIdRef.current;
    const viewer = viewportRef.current;

    isDraggingRef.current = false;
    hasDraggedRef.current = false;
    activePointerIdRef.current = null;
    pointerStartRef.current = null;
    lastPointerRef.current = null;
    dragViewportSizeRef.current = null;
    setGlobalCursor(false);

    if (pointerId === null || !viewer?.hasPointerCapture?.(pointerId)) return;

    try {
      viewer.releasePointerCapture(pointerId);
    } catch (error) {
      console.warn(
        "[useInteractionHandlers] releasePointerCapture failed:",
        error,
      );
    }
  }, [setGlobalCursor, viewportRef]);

  const toggleClickZoom = useCallback(
    (clientX: number, clientY: number) => {
      const viewer = viewportRef.current;

      if (!viewer) return;

      const current = getTransform();
      let next: ImageTransform;

      if (modeRef.current === "fit") {
        const boundingRect = viewer.getBoundingClientRect();
        const cursorX =
          ((clientX - boundingRect.left) / boundingRect.width) * 2 - 1;
        const cursorY = -(
          ((clientY - boundingRect.top) / boundingRect.height) * 2 -
          1
        );
        const scaleFactor = CLICK_ZOOM_SCALE / current.scale;

        next = {
          scale: CLICK_ZOOM_SCALE,
          offsetX:
            current.offsetX + (1 - scaleFactor) * (cursorX - current.offsetX),
          offsetY:
            current.offsetY + (1 - scaleFactor) * (cursorY - current.offsetY),
        };

        animateTransform(next, "manual", {
          anchor: { x: cursorX, y: cursorY },
        });
      } else {
        next = { scale: FIT_SCALE, offsetX: 0, offsetY: 0 };
        animateTransform(next, "fit");
      }
    },
    [animateTransform, getTransform, viewportRef],
  );

  const handleWheel = useCallback(
    (wheelEvent: WheelEvent) => {
      if (!enabledRef.current) return;
      if (
        wheelEvent.target instanceof HTMLElement &&
        wheelEvent.target.closest('[data-filter-ui="true"]')
      ) {
        return;
      }

      const viewer = viewportRef.current;

      if (!viewer) return;

      wheelEvent.preventDefault();
      cancelTransformAnimation();
      setTransformMode("manual");

      const current = getTransform();
      let next: ImageTransform;

      if (wheelEvent.ctrlKey || wheelEvent.metaKey) {
        const boundingRect = viewer.getBoundingClientRect();
        const cursorX =
          ((wheelEvent.clientX - boundingRect.left) / boundingRect.width) * 2 -
          1;
        const cursorY = -(
          ((wheelEvent.clientY - boundingRect.top) / boundingRect.height) * 2 -
          1
        );
        const zoomFactor = wheelEvent.deltaY > 0 ? 0.9 : 1.1;
        const scale = Math.min(
          Math.max(MIN_SCALE, current.scale * zoomFactor),
          MAX_SCALE,
        );
        const scaleFactor = scale / current.scale;

        next = {
          scale,
          offsetX:
            current.offsetX + (1 - scaleFactor) * (cursorX - current.offsetX),
          offsetY:
            current.offsetY + (1 - scaleFactor) * (cursorY - current.offsetY),
        };
      } else {
        const deltaX = normalizeWheelDelta(
          wheelEvent.deltaX,
          wheelEvent.deltaMode,
          viewer.clientWidth || 1,
        );
        const deltaY = normalizeWheelDelta(
          wheelEvent.deltaY,
          wheelEvent.deltaMode,
          viewer.clientHeight || 1,
        );

        next = {
          ...current,
          offsetX:
            current.offsetX - (deltaX * PAN_SPEED) / (viewer.clientWidth || 1),
          offsetY:
            current.offsetY + (deltaY * PAN_SPEED) / (viewer.clientHeight || 1),
        };
      }

      applyLiveTransform(next);
      scheduleWheelCommit();
      if (!isDraggingRef.current) {
        setIdleCursor(next);
      }
    },
    [
      applyLiveTransform,
      cancelTransformAnimation,
      getTransform,
      scheduleWheelCommit,
      setIdleCursor,
      setTransformMode,
      viewportRef,
    ],
  );

  const handlePointerDown = useCallback(
    (pointerDownEvent: PointerEvent) => {
      if (!enabledRef.current) return;
      if (
        pointerDownEvent.target instanceof HTMLElement &&
        pointerDownEvent.target.closest('[data-filter-ui="true"]')
      ) {
        return;
      }
      if (pointerDownEvent.button !== 0) return;

      const viewer = viewportRef.current;

      if (!viewer) return;

      pointerDownEvent.preventDefault();
      viewer.focus({ preventScroll: true });
      clearWheelCommitTimer();
      cancelTransformAnimation();

      isDraggingRef.current = true;
      hasDraggedRef.current = false;
      activePointerIdRef.current = pointerDownEvent.pointerId;
      setGlobalCursor(true);
      setCursor("grabbing");
      lastPointerRef.current = {
        x: pointerDownEvent.clientX,
        y: pointerDownEvent.clientY,
      };
      pointerStartRef.current = {
        x: pointerDownEvent.clientX,
        y: pointerDownEvent.clientY,
      };
      dragViewportSizeRef.current = {
        width: viewer.clientWidth || 1,
        height: viewer.clientHeight || 1,
      };

      try {
        viewer.setPointerCapture?.(pointerDownEvent.pointerId);
      } catch (error) {
        console.warn(
          "[useInteractionHandlers] setPointerCapture failed:",
          error,
        );
      }
    },
    [
      cancelTransformAnimation,
      clearWheelCommitTimer,
      setCursor,
      setGlobalCursor,
      viewportRef,
    ],
  );

  const handlePointerMove = useCallback(
    (pointerMoveEvent: PointerEvent) => {
      if (!enabledRef.current || !isDraggingRef.current) return;

      const viewer = viewportRef.current;
      const lastPointer = lastPointerRef.current;
      const pointerStart = pointerStartRef.current;
      const viewportSize = dragViewportSizeRef.current;

      if (!viewer || !lastPointer || !pointerStart || !viewportSize) return;

      pointerMoveEvent.preventDefault();

      if (!hasDraggedRef.current) {
        const distanceX = pointerMoveEvent.clientX - pointerStart.x;
        const distanceY = pointerMoveEvent.clientY - pointerStart.y;

        if (
          distanceX * distanceX + distanceY * distanceY <
          CLICK_MOVEMENT_THRESHOLD_PX * CLICK_MOVEMENT_THRESHOLD_PX
        ) {
          return;
        }

        hasDraggedRef.current = true;
        setTransformMode("manual");
      }

      const deltaX = pointerMoveEvent.clientX - lastPointer.x;
      const deltaY = pointerMoveEvent.clientY - lastPointer.y;

      lastPointerRef.current = {
        x: pointerMoveEvent.clientX,
        y: pointerMoveEvent.clientY,
      };

      const current = getTransform();

      applyLiveTransform({
        ...current,
        offsetX: current.offsetX + (deltaX * PAN_SPEED) / viewportSize.width,
        offsetY: current.offsetY - (deltaY * PAN_SPEED) / viewportSize.height,
      });
    },
    [applyLiveTransform, getTransform, setTransformMode, viewportRef],
  );

  const handlePointerUp = useCallback(
    (pointerUpEvent: PointerEvent) => {
      if (!isDraggingRef.current) return;

      const hasDragged = hasDraggedRef.current;

      if (hasDragged) {
        commitPendingTransform();
      }

      resetPointerInteraction();

      if (hasDragged) {
        setCursor(isHoveringRef.current ? getIdleCursor(getTransform()) : "");
      } else {
        toggleClickZoom(pointerUpEvent.clientX, pointerUpEvent.clientY);
      }
    },
    [
      commitPendingTransform,
      getTransform,
      resetPointerInteraction,
      setCursor,
      toggleClickZoom,
    ],
  );

  const handlePointerCancel = useCallback(() => {
    if (!isDraggingRef.current) return;

    commitPendingTransform();
    resetPointerInteraction();
    setCursor(isHoveringRef.current ? getIdleCursor(getTransform()) : "");
  }, [
    commitPendingTransform,
    getTransform,
    resetPointerInteraction,
    setCursor,
  ]);

  const handlePointerEnter = useCallback(() => {
    isHoveringRef.current = true;
    if (isDraggingRef.current) return;
    setIdleCursor();
  }, [setIdleCursor]);

  const handlePointerLeave = useCallback(() => {
    isHoveringRef.current = false;
    if (isDraggingRef.current) return;
    setCursor("");
  }, [setCursor]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => {
      reducedMotionRef.current = mediaQuery.matches;
    };

    updateReducedMotion();
    mediaQuery.addEventListener("change", updateReducedMotion);

    return () => mediaQuery.removeEventListener("change", updateReducedMotion);
  }, []);

  useEffect(() => {
    const viewer = viewportRef.current;

    if (!viewer) return;

    viewer.addEventListener("wheel", handleWheel, { passive: false });
    viewer.addEventListener("pointerdown", handlePointerDown);
    viewer.addEventListener("pointermove", handlePointerMove);
    viewer.addEventListener("pointerup", handlePointerUp);
    viewer.addEventListener("pointercancel", handlePointerCancel);
    viewer.addEventListener("pointerenter", handlePointerEnter);
    viewer.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      viewer.removeEventListener("wheel", handleWheel);
      viewer.removeEventListener("pointerdown", handlePointerDown);
      viewer.removeEventListener("pointermove", handlePointerMove);
      viewer.removeEventListener("pointerup", handlePointerUp);
      viewer.removeEventListener("pointercancel", handlePointerCancel);
      viewer.removeEventListener("pointerenter", handlePointerEnter);
      viewer.removeEventListener("pointerleave", handlePointerLeave);
      cancelTransformAnimation();

      if (enabledRef.current && imagePathRef.current) {
        commitPendingTransform();
      } else {
        cancelPendingTransform();
      }

      resetPointerInteraction();
      viewer.style.removeProperty("cursor");
    };
  }, [
    cancelPendingTransform,
    cancelTransformAnimation,
    commitPendingTransform,
    handlePointerDown,
    handlePointerCancel,
    handlePointerEnter,
    handlePointerLeave,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    resetPointerInteraction,
    viewportRef,
  ]);

  const previousInteractionRef = useRef({ enabled, imagePath });

  useEffect(() => {
    const previous = previousInteractionRef.current;
    const imageChanged = previous.imagePath !== imagePath;

    if (imageChanged) {
      cancelTransformAnimation();
      cancelPendingTransform();
      resetPointerInteraction();
    } else if (previous.enabled && !enabled) {
      cancelTransformAnimation();
      commitPendingTransform();
      resetPointerInteraction();
    }

    if (!enabled) {
      setCursor("");
    } else if (isHoveringRef.current) {
      setIdleCursor();
    }

    previousInteractionRef.current = { enabled, imagePath };
  }, [
    cancelPendingTransform,
    cancelTransformAnimation,
    commitPendingTransform,
    enabled,
    imagePath,
    resetPointerInteraction,
    setCursor,
    setIdleCursor,
  ]);

  return { animateTransform };
}
