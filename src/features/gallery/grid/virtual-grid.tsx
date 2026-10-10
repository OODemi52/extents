import type { RefObject } from "react";
import type { FileMetadata } from "@/types/image";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { GridItem } from "./grid-item";

import { useWorkspaceWidthTransitionSubscription } from "@/components/ui/workspace-width-transition";

const GRID_ITEM_SIZE = 140;
const GAP = 8;
const OVERSCAN_ROWS = 4;
const PREFETCH_ROW_BUFFER = 6;
const PANEL_REFLOW_DURATION_MS = 250;
const DIRECT_REFLOW_DURATION_MS = 180;
const REFLOW_EASING = "cubic-bezier(0.25, 0.8, 0.25, 1)";
const RECENT_PANEL_TRANSITION_MS = 100;

type GridGeometry = {
  cellSize: number;
  columns: number;
  rowCount: number;
  rowStride: number;
  totalHeight: number;
  width: number;
};

type Viewport = {
  height: number;
  scrollTop: number;
  width: number;
};

type LayoutSnapshot = {
  endIndex: number;
  files: FileMetadata[];
  geometry: GridGeometry;
  scrollTop: number;
  startIndex: number;
};

export type VirtualGridHandle = {
  getColumns: () => number;
  scrollToIndex: (index: number, align?: "auto" | "center") => void;
};

type VirtualGridProps = {
  active: boolean;
  files: FileMetadata[];
  onSelect: (path: string, selectionMode?: "single" | "multi") => void;
  prefetchThumbnails: (paths: string[]) => void;
  scrollElementRef: RefObject<HTMLDivElement | null>;
  selectedPath: string | null;
  selectedPaths: Set<string>;
  showFileExtensionInGrid: boolean;
  showFileNameInGrid: boolean;
};

const EMPTY_VIEWPORT: Viewport = {
  height: 0,
  scrollTop: 0,
  width: 0,
};

function getColumnCount(width: number) {
  return Math.max(1, Math.floor((width + GAP) / (GRID_ITEM_SIZE + GAP)));
}

function getGridGeometry(width: number, itemCount: number): GridGeometry {
  if (width < 1) {
    return {
      cellSize: GRID_ITEM_SIZE,
      columns: 1,
      rowCount: itemCount,
      rowStride: GRID_ITEM_SIZE + GAP,
      totalHeight: 0,
      width: 0,
    };
  }

  const columns = getColumnCount(width);
  const cellSize = GRID_ITEM_SIZE;
  const rowCount = Math.ceil(itemCount / columns);
  const rowStride = cellSize + GAP;
  const totalHeight = rowCount > 0 ? rowCount * rowStride - GAP : 0;

  return {
    cellSize,
    columns,
    rowCount,
    rowStride,
    totalHeight,
    width,
  };
}

function getItemPosition(
  index: number,
  geometry: GridGeometry,
  layoutWidth = geometry.width,
) {
  const column = index % geometry.columns;
  const row = Math.floor(index / geometry.columns);
  const columnProgress =
    geometry.columns > 1 ? column / (geometry.columns - 1) : 0;

  return {
    x: Math.max(0, layoutWidth - geometry.rowStride) * columnProgress,
    y: row * geometry.rowStride,
  };
}

function getItemLeft(index: number, geometry: GridGeometry) {
  const column = index % geometry.columns;

  if (geometry.columns === 1) return "0px";

  const columnProgress = column / (geometry.columns - 1);

  return `calc(${columnProgress * 100}% - ${columnProgress * geometry.rowStride}px)`;
}

function getItemTransform(x: number, y: number) {
  return `translate3d(${x}px, ${y}px, 0)`;
}

function getItemBaseTransform(index: number, geometry: GridGeometry) {
  const { y } = getItemPosition(index, geometry);

  return getItemTransform(0, y);
}

function getContentRect(element: HTMLDivElement) {
  const styles = window.getComputedStyle(element);
  const horizontalPadding =
    Number.parseFloat(styles.paddingLeft) +
    Number.parseFloat(styles.paddingRight);
  const verticalPadding =
    Number.parseFloat(styles.paddingTop) +
    Number.parseFloat(styles.paddingBottom);

  return {
    height: Math.max(0, element.clientHeight - verticalPadding),
    width: Math.max(0, element.clientWidth - horizontalPadding),
  };
}

function clampScrollTop(
  scrollTop: number,
  geometry: GridGeometry,
  viewportHeight: number,
) {
  return Math.min(
    Math.max(0, scrollTop),
    Math.max(0, geometry.totalHeight - viewportHeight),
  );
}

export const VirtualGrid = memo(
  forwardRef<VirtualGridHandle, VirtualGridProps>(function VirtualGrid(
    {
      active,
      files,
      onSelect,
      prefetchThumbnails,
      scrollElementRef,
      selectedPath,
      selectedPaths,
      showFileExtensionInGrid,
      showFileNameInGrid,
    },
    ref,
  ) {
    const surfaceRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef(0);
    const pendingViewportRef = useRef<Partial<Viewport>>({});
    const pendingScrollAdjustmentRef = useRef<number | null>(null);
    const viewportRef = useRef(EMPTY_VIEWPORT);
    const geometryRef = useRef(getGridGeometry(0, files.length));
    const itemCountRef = useRef(files.length);
    const layoutSnapshotRef = useRef<LayoutSnapshot | null>(null);
    const animationsRef = useRef(new Map<string, Animation>());
    const reducedMotionRef = useRef(false);
    const panelTransitionRef = useRef({ active: false, completedAt: 0 });
    const [viewport, setViewport] = useState(EMPTY_VIEWPORT);

    itemCountRef.current = files.length;

    const geometry = useMemo(
      () => getGridGeometry(viewport.width, files.length),
      [files.length, viewport.width],
    );

    const handlePanelTransition = useCallback(
      (transitionActive: boolean) => {
        if (!active) {
          panelTransitionRef.current = { active: false, completedAt: 0 };

          return;
        }

        panelTransitionRef.current.active = transitionActive;

        if (!transitionActive) {
          panelTransitionRef.current.completedAt = performance.now();
        }
      },
      [active],
    );

    useWorkspaceWidthTransitionSubscription(handlePanelTransition);

    const commitPendingViewport = useCallback(() => {
      frameRef.current = 0;

      if (!active) return;

      const element = scrollElementRef.current;

      if (!element) return;

      const pending = pendingViewportRef.current;
      const previousViewport = viewportRef.current;
      const previousGeometry = geometryRef.current;
      const rect = getContentRect(element);
      const retainedWidth =
        previousViewport.width > 0 ? previousViewport.width : rect.width;
      const width = Math.round(pending.width ?? retainedWidth);
      const height = Math.round(pending.height ?? rect.height);
      const nextGeometry = getGridGeometry(width, itemCountRef.current);
      let scrollTop = pending.scrollTop ?? element.scrollTop;

      pendingViewportRef.current = {};

      if (
        previousGeometry.width > 0 &&
        Math.abs(width - previousGeometry.width) >= 1 &&
        itemCountRef.current > 0
      ) {
        const previousRow = Math.floor(
          previousViewport.scrollTop / previousGeometry.rowStride,
        );
        const anchorIndex = Math.min(
          itemCountRef.current - 1,
          previousRow * previousGeometry.columns,
        );
        const rowProgress =
          (previousViewport.scrollTop -
            previousRow * previousGeometry.rowStride) /
          previousGeometry.rowStride;
        const nextRow = Math.floor(anchorIndex / nextGeometry.columns);

        scrollTop = clampScrollTop(
          nextRow * nextGeometry.rowStride +
            rowProgress * nextGeometry.rowStride,
          nextGeometry,
          height,
        );
        pendingScrollAdjustmentRef.current = scrollTop;
      }

      const nextViewport = { height, scrollTop, width };

      if (
        Math.abs(nextViewport.width - previousViewport.width) < 1 &&
        Math.abs(nextViewport.height - previousViewport.height) < 1 &&
        Math.abs(nextViewport.scrollTop - previousViewport.scrollTop) < 0.5
      ) {
        return;
      }

      viewportRef.current = nextViewport;
      geometryRef.current = nextGeometry;
      setViewport(nextViewport);
    }, [active, scrollElementRef]);

    const scheduleViewport = useCallback(
      (nextViewport: Partial<Viewport>) => {
        pendingViewportRef.current = {
          ...pendingViewportRef.current,
          ...nextViewport,
        };

        if (frameRef.current) return;

        frameRef.current = window.requestAnimationFrame(commitPendingViewport);
      },
      [commitPendingViewport],
    );

    useLayoutEffect(() => {
      if (!active) return;

      const element = scrollElementRef.current;

      if (!element) return;

      const rect = getContentRect(element);

      pendingViewportRef.current = {
        height: rect.height,
        scrollTop: element.scrollTop,
        width: rect.width,
      };
      commitPendingViewport();

      const handleScroll = () => {
        scheduleViewport({ scrollTop: element.scrollTop });
      };
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];

        if (!entry) return;

        const heightChanged =
          Math.abs(entry.contentRect.height - viewportRef.current.height) >= 1;
        const columnsChanged =
          getColumnCount(entry.contentRect.width) !==
          geometryRef.current.columns;

        if (!heightChanged && !columnsChanged) return;

        scheduleViewport({
          ...(heightChanged ? { height: entry.contentRect.height } : {}),
          ...(columnsChanged ? { width: entry.contentRect.width } : {}),
        });
      });

      element.addEventListener("scroll", handleScroll, { passive: true });
      observer.observe(element);

      return () => {
        element.removeEventListener("scroll", handleScroll);
        observer.disconnect();

        if (frameRef.current) {
          window.cancelAnimationFrame(frameRef.current);
          frameRef.current = 0;
        }
      };
    }, [active, commitPendingViewport, scheduleViewport, scrollElementRef]);

    useEffect(() => {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const updateReducedMotion = () => {
        reducedMotionRef.current = mediaQuery.matches;
      };

      updateReducedMotion();
      mediaQuery.addEventListener("change", updateReducedMotion);

      return () =>
        mediaQuery.removeEventListener("change", updateReducedMotion);
    }, []);

    const visibleStartRow = Math.max(
      0,
      Math.floor(viewport.scrollTop / geometry.rowStride),
    );
    const visibleEndRow = Math.min(
      geometry.rowCount - 1,
      Math.floor((viewport.scrollTop + viewport.height) / geometry.rowStride),
    );
    const startRow = Math.max(0, visibleStartRow - OVERSCAN_ROWS);
    const endRow = Math.min(
      geometry.rowCount - 1,
      visibleEndRow + OVERSCAN_ROWS,
    );
    const startIndex = startRow * geometry.columns;
    const endIndex = Math.min(
      files.length - 1,
      (endRow + 1) * geometry.columns - 1,
    );
    const renderedIndices = useMemo(() => {
      if (!active || geometry.width < 1 || endIndex < startIndex) return [];

      return Array.from(
        { length: endIndex - startIndex + 1 },
        (_, offset) => startIndex + offset,
      );
    }, [active, endIndex, geometry.width, startIndex]);

    useLayoutEffect(() => {
      if (!active) {
        animationsRef.current.forEach((animation) => animation.cancel());
        animationsRef.current.clear();
        layoutSnapshotRef.current = null;
        geometryRef.current = geometry;
        viewportRef.current = viewport;

        return;
      }

      const scrollAdjustment = pendingScrollAdjustmentRef.current;
      const element = scrollElementRef.current;

      if (scrollAdjustment !== null && element) {
        pendingScrollAdjustmentRef.current = null;
        element.scrollTop = scrollAdjustment;
      }

      const previous = layoutSnapshotRef.current;
      const columnsChanged =
        previous !== null &&
        previous.geometry.width > 0 &&
        previous.files === files &&
        previous.geometry.columns !== geometry.columns;

      if (columnsChanged && !reducedMotionRef.current && surfaceRef.current) {
        const now = performance.now();
        const panelTransition = panelTransitionRef.current;
        const followsPanelTransition =
          panelTransition.active ||
          now - panelTransition.completedAt < RECENT_PANEL_TRANSITION_MS;
        const duration = followsPanelTransition
          ? PANEL_REFLOW_DURATION_MS
          : DIRECT_REFLOW_DURATION_MS;
        const scrollDelta = viewport.scrollTop - previous.scrollTop;
        const layoutWidth = surfaceRef.current.clientWidth;
        const plans = Array.from(
          surfaceRef.current.querySelectorAll<HTMLElement>(
            "[data-grid-item-path]",
          ),
        )
          .map((item) => {
            const index = Number(item.dataset.gridItemIndex);
            const path = item.dataset.gridItemPath;

            if (
              !path ||
              !Number.isInteger(index) ||
              index < previous.startIndex ||
              index > previous.endIndex
            ) {
              return null;
            }

            const currentAnimation = animationsRef.current.get(path);
            const previousPosition = getItemPosition(
              index,
              previous.geometry,
              layoutWidth,
            );
            const nextPosition = getItemPosition(index, geometry, layoutWidth);
            const fromTransform = currentAnimation
              ? window.getComputedStyle(item).transform
              : getItemTransform(
                  previousPosition.x - nextPosition.x,
                  previousPosition.y + scrollDelta,
                );

            return {
              currentAnimation,
              fromTransform,
              item,
              path,
              toTransform: getItemTransform(0, nextPosition.y),
            };
          })
          .filter((plan) => plan !== null);

        plans.forEach(
          ({ currentAnimation, fromTransform, item, path, toTransform }) => {
            currentAnimation?.cancel();
            item.style.willChange = "transform";

            const animation = item.animate(
              [{ transform: fromTransform }, { transform: toTransform }],
              {
                duration,
                easing: REFLOW_EASING,
              },
            );

            animationsRef.current.set(path, animation);
            animation.addEventListener(
              "finish",
              () => {
                if (animationsRef.current.get(path) === animation) {
                  animationsRef.current.delete(path);
                  item.style.willChange = "";
                }
              },
              { once: true },
            );
          },
        );
      }

      geometryRef.current = geometry;
      viewportRef.current = viewport;
      layoutSnapshotRef.current = {
        endIndex,
        files,
        geometry,
        scrollTop: viewport.scrollTop,
        startIndex,
      };
    }, [
      active,
      endIndex,
      files,
      geometry,
      scrollElementRef,
      startIndex,
      viewport,
    ]);

    useEffect(
      () => () => {
        animationsRef.current.forEach((animation) => animation.cancel());
        animationsRef.current.clear();
      },
      [],
    );

    useEffect(() => {
      if (!active || files.length === 0 || visibleEndRow < visibleStartRow) {
        return;
      }

      const prefetchStartRow = Math.max(
        0,
        visibleStartRow - PREFETCH_ROW_BUFFER,
      );
      const prefetchEndRow = Math.min(
        geometry.rowCount - 1,
        visibleEndRow + PREFETCH_ROW_BUFFER,
      );
      const visibleStartIndex = visibleStartRow * geometry.columns;
      const visibleEndIndex = Math.min(
        files.length - 1,
        (visibleEndRow + 1) * geometry.columns - 1,
      );
      const offScreenPaths: string[] = [];

      for (
        let index = prefetchStartRow * geometry.columns;
        index <=
        Math.min(files.length - 1, (prefetchEndRow + 1) * geometry.columns - 1);
        index += 1
      ) {
        if (index < visibleStartIndex || index > visibleEndIndex) {
          offScreenPaths.push(files[index].path);
        }
      }

      if (offScreenPaths.length === 0) return;

      const timer = window.setTimeout(() => {
        prefetchThumbnails(offScreenPaths);
      }, 500);

      return () => window.clearTimeout(timer);
    }, [
      active,
      files,
      geometry.columns,
      geometry.rowCount,
      prefetchThumbnails,
      visibleEndRow,
      visibleStartRow,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        getColumns: () => geometryRef.current.columns,
        scrollToIndex: (index, align = "auto") => {
          const element = scrollElementRef.current;
          const currentGeometry = geometryRef.current;
          const viewportHeight =
            viewportRef.current.height || element?.clientHeight || 0;

          if (!element || index < 0 || index >= itemCountRef.current) return;

          const row = Math.floor(index / currentGeometry.columns);
          const itemStart = row * currentGeometry.rowStride;
          const itemEnd = itemStart + currentGeometry.cellSize;
          const viewportStart = element.scrollTop;
          const viewportEnd = viewportStart + viewportHeight;
          let nextScrollTop = viewportStart;

          if (align === "center") {
            nextScrollTop =
              itemStart - (viewportHeight - currentGeometry.cellSize) / 2;
          } else if (itemStart < viewportStart) {
            nextScrollTop = itemStart;
          } else if (itemEnd > viewportEnd) {
            nextScrollTop = itemEnd - element.clientHeight;
          }

          element.scrollTop = clampScrollTop(
            nextScrollTop,
            currentGeometry,
            viewportHeight,
          );
        },
      }),
      [scrollElementRef],
    );

    return (
      <div
        ref={surfaceRef}
        style={{
          height: active ? `${geometry.totalHeight}px` : 0,
          position: "relative",
          width: "100%",
        }}
      >
        {renderedIndices.map((index) => {
          const file = files[index];

          return (
            <div
              key={file.path}
              data-grid-item-index={index}
              data-grid-item-path={file.path}
              style={{
                height: `${geometry.cellSize}px`,
                left: getItemLeft(index, geometry),
                position: "absolute",
                top: 0,
                transform: getItemBaseTransform(index, geometry),
                width: `${geometry.cellSize}px`,
              }}
            >
              <GridItem
                file={file}
                index={index}
                isActive={file.path === selectedPath}
                isSelected={selectedPaths.has(file.path)}
                showFileExtensionInGrid={showFileExtensionInGrid}
                showFileNameInGrid={showFileNameInGrid}
                onSelect={onSelect}
              />
            </div>
          );
        })}
      </div>
    );
  }),
);

VirtualGrid.displayName = "VirtualGrid";
