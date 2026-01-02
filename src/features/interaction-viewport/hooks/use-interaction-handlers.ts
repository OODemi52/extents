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
  hasImage: boolean,
) {
  const setScale = useImageTransformStore((state) => state.setScale);

  const setOffset = useImageTransformStore((state) => state.setOffset);
  const isDraggingRef = useRef(false);
  const isHoveringRef = useRef(false);

  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  const setCursor = useCallback(
    (cursor: string) => {
      const viewer = viewportRef.current;

      if (!viewer) return;
      viewer.style.cursor = hasImage ? cursor : "";
    },
    [viewportRef, hasImage],
  );

  const setGlobalCursor = useCallback((isActive: boolean) => {
    document.body.classList.toggle("cursor-grabbing", isActive);
  }, []);
  const handleWheel = useCallback(
    (wheelEvent: WheelEvent) => {
      if (
        wheelEvent.target instanceof HTMLElement &&
        wheelEvent.target.closest('[data-filter-ui="true"]')
      ) {
        return;
      }

      wheelEvent.preventDefault();

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
    [scale, offsetX, offsetY, setScale, setOffset, viewportRef],
  );

  const handlePointerDown = useCallback(
    (pointerDownEvent: PointerEvent) => {
      if (
        pointerDownEvent.target instanceof HTMLElement &&
        pointerDownEvent.target.closest('[data-filter-ui="true"]')
      ) {
        return;
      }

      if (!hasImage) return;

      if (pointerDownEvent.button !== 0) return;

      const viewer = viewportRef.current;

      if (!viewer) return;

      pointerDownEvent.preventDefault();

      isDraggingRef.current = true;
      setGlobalCursor(true);
      setCursor("grabbing");

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
    [viewportRef, setCursor, setGlobalCursor, hasImage],
  );

  const handlePointerMove = useCallback(
    (pointerMoveEvent: PointerEvent) => {
      if (
        pointerMoveEvent.target instanceof HTMLElement &&
        pointerMoveEvent.target.closest('[data-filter-ui="true"]')
      ) {
        return;
      }

      if (!hasImage) return;

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
    },
    [setOffset, viewportRef, hasImage],
  );

  const handlePointerUp = useCallback(
    (pointerUpEvent: PointerEvent) => {
      if (
        pointerUpEvent.target instanceof HTMLElement &&
        pointerUpEvent.target.closest('[data-filter-ui="true"]')
      ) {
        return;
      }

      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      setGlobalCursor(false);

      if (isHoveringRef.current) {
        setCursor("grab");
      } else {
        setCursor("");
      }

      lastPointerRef.current = null;

      try {
        viewportRef.current?.releasePointerCapture?.(pointerUpEvent.pointerId);
      } catch (err) {
        console.warn(
          "[useInteractionHandlers] releasePointerCapture failed:",
          err,
        );
      }
    },
    [viewportRef, setCursor, setGlobalCursor],
  );

  const handlePointerEnter = useCallback(() => {
    isHoveringRef.current = true;
    if (isDraggingRef.current) return;
    setCursor("grab");
  }, [setCursor]);

  const handlePointerLeave = useCallback(() => {
    isHoveringRef.current = false;
    if (isDraggingRef.current) return;
    setCursor("");
  }, [setCursor]);

  useEffect(() => {
    const viewer = viewportRef.current;

    if (!viewer) return;

    viewer.addEventListener("wheel", handleWheel, { passive: false });
    viewer.addEventListener("pointerdown", handlePointerDown);
    viewer.addEventListener("pointermove", handlePointerMove);
    viewer.addEventListener("pointerup", handlePointerUp);
    viewer.addEventListener("pointercancel", handlePointerUp);
    viewer.addEventListener("pointerenter", handlePointerEnter);
    viewer.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      viewer.removeEventListener("wheel", handleWheel);
      viewer.removeEventListener("pointerdown", handlePointerDown);
      viewer.removeEventListener("pointermove", handlePointerMove);
      viewer.removeEventListener("pointerup", handlePointerUp);
      viewer.removeEventListener("pointercancel", handlePointerUp);
      viewer.removeEventListener("pointerenter", handlePointerEnter);
      viewer.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerEnter,
    handlePointerLeave,
  ]);

  useEffect(() => {
    return () => {
      viewportRef.current?.style.removeProperty("cursor");
      document.body.classList.remove("cursor-grabbing");
    };
  }, [viewportRef]);
}
