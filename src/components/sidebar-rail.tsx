import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { Sidebar } from "./sidebar";
import { AnimatedSidePanel } from "./ui/animated-side-panel";

import {
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  useLayoutStore,
} from "@/store/layout-store";

export const SidebarRail = memo(function SidebarRail() {
  const sidebarVisible = useLayoutStore((state) => state.panels.sidebar);
  const sidePanelsHidden = useLayoutStore((state) => state.sidePanelsHidden);
  const sidebarWidth = useLayoutStore((state) => state.sidebarWidth);
  const setSidebarWidth = useLayoutStore((state) => state.setSidebarWidth);
  const isSidebarOpen = sidebarVisible && !sidePanelsHidden;
  const [liveSidebarWidth, setLiveSidebarWidth] = useState(
    sidebarWidth || SIDEBAR_DEFAULT_WIDTH,
  );
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const liveSidebarWidthRef = useRef(liveSidebarWidth);
  const sidebarResizeRef = useRef<{
    pointerId: number;
    startWidth: number;
    startX: number;
  } | null>(null);

  useEffect(() => {
    if (!sidebarResizeRef.current) {
      liveSidebarWidthRef.current = sidebarWidth;
      setLiveSidebarWidth(sidebarWidth);
    }
  }, [sidebarWidth]);

  useEffect(
    () => () => {
      document.body.classList.remove("cursor-col-resize");
    },
    [],
  );

  const handleSidebarResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      sidebarResizeRef.current = {
        pointerId: event.pointerId,
        startWidth: liveSidebarWidthRef.current,
        startX: event.clientX,
      };
      setIsSidebarResizing(true);
      document.body.classList.add("cursor-col-resize");
    },
    [],
  );

  const handleSidebarResizeMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const resize = sidebarResizeRef.current;

      if (!resize || resize.pointerId !== event.pointerId) return;

      const nextWidth = Math.min(
        SIDEBAR_MAX_WIDTH,
        Math.max(
          SIDEBAR_MIN_WIDTH,
          resize.startWidth + event.clientX - resize.startX,
        ),
      );

      liveSidebarWidthRef.current = nextWidth;
      setLiveSidebarWidth(nextWidth);
    },
    [],
  );

  const handleSidebarResizeEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const resize = sidebarResizeRef.current;

      if (!resize || resize.pointerId !== event.pointerId) return;

      sidebarResizeRef.current = null;
      setIsSidebarResizing(false);
      document.body.classList.remove("cursor-col-resize");
      setSidebarWidth(liveSidebarWidthRef.current);
    },
    [setSidebarWidth],
  );

  return (
    <AnimatedSidePanel
      contentClassName="pl-2"
      motionEnabled={!isSidebarResizing}
      open={isSidebarOpen}
      side="left"
      width={liveSidebarWidth}
    >
      <div className="relative h-full">
        <Sidebar />
        <div
          aria-label="Resize library sidebar"
          aria-orientation="vertical"
          aria-valuemax={SIDEBAR_MAX_WIDTH}
          aria-valuemin={SIDEBAR_MIN_WIDTH}
          aria-valuenow={Math.round(liveSidebarWidth)}
          className="workspace-sash workspace-sash-vertical absolute inset-y-0 right-0 z-20 cursor-col-resize touch-none"
          data-active={isSidebarResizing ? "true" : undefined}
          role="separator"
          onPointerCancel={handleSidebarResizeEnd}
          onPointerDown={handleSidebarResizeStart}
          onPointerMove={handleSidebarResizeMove}
          onPointerUp={handleSidebarResizeEnd}
        />
      </div>
    </AnimatedSidePanel>
  );
});
