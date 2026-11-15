import { motion, type Transition } from "framer-motion";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

const FILMSTRIP_PANEL_TRANSITION: Transition = {
  duration: 0.26,
  ease: [0.4, 0, 0.2, 1],
};

type AnimatedFilmstripPanelProps = {
  children: (height: number) => ReactNode;
  className?: string;
  height: number;
  maxHeight: number;
  minHeight: number;
  motionEnabled?: boolean;
  onHeightCommit: (height: number) => void;
  open: boolean;
};

const clampHeight = (height: number, minHeight: number, maxHeight: number) =>
  Math.min(maxHeight, Math.max(minHeight, height));

export function AnimatedFilmstripPanel({
  children,
  className,
  height,
  maxHeight,
  minHeight,
  motionEnabled = true,
  onHeightCommit,
  open,
}: AnimatedFilmstripPanelProps) {
  const [liveHeight, setLiveHeight] = useState(() =>
    clampHeight(height, minHeight, maxHeight),
  );
  const [isResizing, setIsResizing] = useState(false);
  const [contentMounted, setContentMounted] = useState(open);
  const liveHeightRef = useRef(liveHeight);
  const openRef = useRef(open);
  const resizeRef = useRef<{
    pointerId: number;
    startHeight: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    if (resizeRef.current) return;

    const nextHeight = clampHeight(height, minHeight, maxHeight);

    liveHeightRef.current = nextHeight;
    setLiveHeight(nextHeight);
  }, [height, maxHeight, minHeight]);

  openRef.current = open;

  useLayoutEffect(() => {
    if (open) {
      setContentMounted(true);
    }
  }, [open]);

  useEffect(
    () => () => {
      document.body.classList.remove("cursor-row-resize");
    },
    [],
  );

  const handleResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!open) return;

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      resizeRef.current = {
        pointerId: event.pointerId,
        startHeight: liveHeightRef.current,
        startY: event.clientY,
      };
      setIsResizing(true);
      document.body.classList.add("cursor-row-resize");
    },
    [open],
  );

  const handleResizeMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const resize = resizeRef.current;

      if (!resize || resize.pointerId !== event.pointerId) return;

      const nextHeight = clampHeight(
        resize.startHeight + resize.startY - event.clientY,
        minHeight,
        maxHeight,
      );

      liveHeightRef.current = nextHeight;
      setLiveHeight(nextHeight);
    },
    [maxHeight, minHeight],
  );

  const handleResizeEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const resize = resizeRef.current;

      if (!resize || resize.pointerId !== event.pointerId) return;

      resizeRef.current = null;
      setIsResizing(false);
      document.body.classList.remove("cursor-row-resize");
      onHeightCommit(liveHeightRef.current);
    },
    [onHeightCommit],
  );

  const transition =
    motionEnabled && !isResizing ? FILMSTRIP_PANEL_TRANSITION : { duration: 0 };

  return (
    <motion.div
      animate={{ height: open ? liveHeight : 0 }}
      aria-hidden={!open}
      className={cn(
        "relative w-full shrink-0 overflow-hidden [contain:layout_paint]",
        open ? "pointer-events-auto" : "pointer-events-none",
        className,
      )}
      initial={false}
      transition={transition}
      onAnimationComplete={() => {
        if (!openRef.current) {
          setContentMounted(false);
        }
      }}
    >
      <div
        className="absolute inset-x-0 bottom-0"
        inert={!open || undefined}
        style={{ height: liveHeight }}
      >
        <div
          aria-label="Resize filmstrip"
          aria-orientation="horizontal"
          aria-valuemax={maxHeight}
          aria-valuemin={minHeight}
          aria-valuenow={Math.round(liveHeight)}
          className="workspace-sash workspace-sash-horizontal absolute inset-x-0 top-0 z-30 cursor-row-resize touch-none"
          data-active={isResizing ? "true" : undefined}
          role="separator"
          onPointerCancel={handleResizeEnd}
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
        />
        {open || contentMounted ? children(liveHeight) : null}
      </div>
    </motion.div>
  );
}
