import { useEffect, useRef, useCallback } from "react";

import { useImageTransformStore } from "@/store/transform-store";

const MIN_SCALE = 0.01;
const MAX_SCALE = 30;
const PAN_SPEED = 1.5;

export function useInteractionHandlers(
  viewportRef: React.RefObject<HTMLDivElement>,
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  const setScale = useImageTransformStore((state) => state.setScale);

  const setOffset = useImageTransformStore((state) => state.setOffset);

  const idleTimeoutRef = useRef<number | null>(null);

  const isDraggingRef = useRef(false);

  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  const bumpRenderActivity = useCallback(() => {
    if (idleTimeoutRef.current !== null) {
      clearTimeout(idleTimeoutRef.current);
    }
  }, []);

  const handleWheel = useCallback(
    (wheelEvent: WheelEvent) => {
      wheelEvent.preventDefault();
      bumpRenderActivity();

      const viewer = viewportRef.current;

      if (!viewer) return;

      const boundingRect = viewer.getBoundingClientRect();
      const cursorX =
        ((wheelEvent.clientX - boundingRect.left) / boundingRect.width) * 2 - 1;
      const cursorY = -(
        ((wheelEvent.clientY - boundingRect.top) / boundingRect.height) * 2 -
        1
      );

      if (wheelEvent.ctrlKey || wheelEvent.metaKey) {
        // Zoom
        const zoomFactor = wheelEvent.deltaY > 0 ? 0.9 : 1.1;

        const newScale = Math.min(
          Math.max(MIN_SCALE, scale * zoomFactor),
          MAX_SCALE,
        );

        const scaleFactor = newScale / scale;

        setScale(newScale);

        setOffset({
          x: offsetX + (1 - scaleFactor) * (cursorX - offsetX),
          y: offsetY + (1 - scaleFactor) * (cursorY - offsetY),
        });
      } else {
        // Pan
        setOffset({
          x:
            offsetX -
            (wheelEvent.deltaX * PAN_SPEED) / (viewer.clientWidth || 1),
          y:
            offsetY +
            (wheelEvent.deltaY * PAN_SPEED) / (viewer.clientHeight || 1),
        });
      }
    },
    [
      scale,
      offsetX,
      offsetY,
      setScale,
      setOffset,
      bumpRenderActivity,
      viewportRef,
    ],
  );

  const handlePointerDown = useCallback(
    (pointerDownEvent: PointerEvent) => {
      if (pointerDownEvent.button !== 0) return;

      const viewer = viewportRef.current;

      if (!viewer) return;

      pointerDownEvent.preventDefault();

      bumpRenderActivity();

      isDraggingRef.current = true;

      lastPointerRef.current = {
        x: pointerDownEvent.clientX,

        y: pointerDownEvent.clientY,
      };

      try {
        viewer.setPointerCapture?.(pointerDownEvent.pointerId);
      } catch (err) {
        console.warn("[useInteractionHandlers] setPointerCapture failed:", err);
      }
    },
    [bumpRenderActivity, viewportRef],
  );

  const handlePointerMove = useCallback(
    (pointerMoveEvent: PointerEvent) => {
      if (!isDraggingRef.current || !viewportRef.current) return;

      pointerMoveEvent.preventDefault();

      const last = lastPointerRef.current;

      if (!last) {
        lastPointerRef.current = {
          x: pointerMoveEvent.clientX,

          y: pointerMoveEvent.clientY,
        };

        return;
      }

      const deltaX = pointerMoveEvent.clientX - last.x;

      const deltaY = pointerMoveEvent.clientY - last.y;

      lastPointerRef.current = {
        x: pointerMoveEvent.clientX,

        y: pointerMoveEvent.clientY,
      };

      const viewer = viewportRef.current;

      const width = viewer.clientWidth || 1;

      const height = viewer.clientHeight || 1;

      const { offsetX: currentX, offsetY: currentY } =
        useImageTransformStore.getState();

      setOffset({
        x: currentX + (deltaX * PAN_SPEED) / width,

        y: currentY - (deltaY * PAN_SPEED) / height,
      });

      bumpRenderActivity();
    },
    [setOffset, bumpRenderActivity, viewportRef],
  );

  const handlePointerUp = useCallback(
    (pointerUpEvent: PointerEvent) => {
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;

      lastPointerRef.current = null;

      try {
        viewportRef.current?.releasePointerCapture?.(pointerUpEvent.pointerId);
      } catch (err) {
        console.warn(
          "[useInteractionHandlers] releasePointerCapture failed:",
          err,
        );
      }

      bumpRenderActivity();
    },
    [bumpRenderActivity, viewportRef],
  );

  useEffect(() => {
    const viewer = viewportRef.current;

    if (!viewer) return;

    viewer.addEventListener("wheel", handleWheel, { passive: false });
    viewer.addEventListener("pointerdown", handlePointerDown);
    viewer.addEventListener("pointermove", handlePointerMove);
    viewer.addEventListener("pointerup", handlePointerUp);
    viewer.addEventListener("pointerleave", handlePointerUp);
    viewer.addEventListener("pointercancel", handlePointerUp);

    return () => {
      viewer.removeEventListener("wheel", handleWheel);
      viewer.removeEventListener("pointerdown", handlePointerDown);
      viewer.removeEventListener("pointermove", handlePointerMove);
      viewer.removeEventListener("pointerup", handlePointerUp);
      viewer.removeEventListener("pointerleave", handlePointerUp);
      viewer.removeEventListener("pointercancel", handlePointerUp);

      if (idleTimeoutRef.current !== null) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [handleWheel, handlePointerDown, handlePointerMove, handlePointerUp]);
}
