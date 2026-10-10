import type { KeyboardEvent, PointerEvent } from "react";

import { useEffect, useRef, useState } from "react";

type PanelResizeOptions = {
  max: number;
  min: number;
  onCommit: (width: number) => void;
  side: "left" | "right";
  width: number;
};

export function usePanelResize({
  max,
  min,
  onCommit,
  side,
  width,
}: PanelResizeOptions) {
  const [liveWidth, setLiveWidth] = useState(() =>
    Math.min(max, Math.max(min, width)),
  );
  const [resizing, setResizing] = useState(false);
  const widthRef = useRef(liveWidth);
  const frameRef = useRef<number | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startWidth: number;
    startX: number;
  } | null>(null);
  const clamp = (value: number) => Math.min(max, Math.max(min, value));

  useEffect(() => {
    if (dragRef.current) return;

    const nextWidth = Math.min(max, Math.max(min, width));

    widthRef.current = nextWidth;
    setLiveWidth(nextWidth);
  }, [max, min, width]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (dragRef.current) document.body.classList.remove("cursor-col-resize");
    },
    [],
  );

  const finish = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;

    dragRef.current = null;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setLiveWidth(widthRef.current);
    setResizing(false);
    document.body.classList.remove("cursor-col-resize");
    onCommit(widthRef.current);
  };

  return {
    liveWidth,
    resizing,
    separatorProps: {
      "aria-orientation": "vertical" as const,
      "aria-valuemax": max,
      "aria-valuemin": min,
      "aria-valuenow": Math.round(liveWidth),
      role: "separator",
      tabIndex: -1,
      onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

        event.preventDefault();
        event.stopPropagation();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const next = clamp(
          widthRef.current + direction * (side === "left" ? 16 : -16),
        );

        widthRef.current = next;
        setLiveWidth(next);
        onCommit(next);
      },
      onLostPointerCapture: finish,
      onPointerCancel: finish,
      onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
          pointerId: event.pointerId,
          startWidth: widthRef.current,
          startX: event.clientX,
        };
        setResizing(true);
        document.body.classList.add("cursor-col-resize");
      },
      onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;

        if (!drag || drag.pointerId !== event.pointerId) return;

        widthRef.current = clamp(
          drag.startWidth +
            (event.clientX - drag.startX) * (side === "left" ? 1 : -1),
        );
        if (frameRef.current !== null) return;

        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null;
          setLiveWidth(widthRef.current);
        });
      },
      onPointerUp: finish,
    },
  };
}
