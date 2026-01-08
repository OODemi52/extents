import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { usePrefetchThumbnails } from "../hooks/use-thumbnails";
import { useScrubbing } from "../hooks/use-scrubbing";

import { GridItem } from "./grid-item";

import { useImageLoader } from "@/hooks/use-image-loader";
import { useImageStore } from "@/store/image-store";
import { useFilteredImages } from "@/features/filter/hooks/use-filtered-files";
import { FilterMenuBar } from "@/features/filter/components/menu-bar/menu-bar";
import { useFilterStore } from "@/features/filter/stores/filter-store";
import { useLayoutStore } from "@/store/layout-store";
import { useGalleryPreferencesStore } from "@/features/gallery/stores/gallery-preferences-store";

const THUMBNAIL_SIZE = 140;
const GAP = 8;
const PREFETCH_ROW_BUFFER = 6;

export function ThumbnailGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const lastWidthRef = useRef(0);
  const isSidebarResizing = useLayoutStore((state) => state.isSidebarResizing);
  const isSidebarResizingRef = useRef(isSidebarResizing);

  const { files, selectedIndex } = useImageStore();
  const selectedPaths = useImageStore((state) => state.selectedPaths);
  const filteredFiles = useFilteredImages();
  const { handleSelectImageByPath } = useImageLoader();
  const { startScrubbing } = useScrubbing();

  const handleSelect = useCallback(
    (path: string, selectionMode?: "single" | "multi") =>
      handleSelectImageByPath(path, selectionMode),
    [handleSelectImageByPath],
  );
  const prefetchThumbnails = usePrefetchThumbnails();
  const hasBaseImages = files.length > 0;
  const isFilterOpen = useFilterStore((state) => state.isOpen);
  const showFileNameInGrid = useGalleryPreferencesStore(
    (state) => state.showFileNameInGrid,
  );
  const showFileExtensionInGrid = useGalleryPreferencesStore(
    (state) => state.showFileExtensionInGrid,
  );

  const filteredPaths = useMemo(
    () => filteredFiles.map((file) => file.path),
    [filteredFiles],
  );

  const updateWidth = useCallback((width: number) => {
    const resizeStep = isSidebarResizingRef.current ? 1 : 1;

    const nextWidth =
      resizeStep > 1
        ? Math.round(width / resizeStep) * resizeStep
        : Math.round(width);

    if (Math.abs(nextWidth - lastWidthRef.current) < 1) return;

    lastWidthRef.current = nextWidth;

    setContainerWidth(nextWidth);
  }, []);

  useEffect(() => {
    isSidebarResizingRef.current = isSidebarResizing;

    if (!isSidebarResizing && containerRef.current) {
      updateWidth(containerRef.current.getBoundingClientRect().width);
    }
  }, [isSidebarResizing, updateWidth]);

  useEffect(() => {
    const element = containerRef.current;

    if (!element) return;

    let frame = 0;
    let pendingWidth = 0;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) return;

      pendingWidth = entry.contentRect.width;
      if (frame) return;

      frame = requestAnimationFrame(() => {
        frame = 0;
        updateWidth(pendingWidth);
      });
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [updateWidth]);

  const availableWidth = containerWidth > 0 ? containerWidth : THUMBNAIL_SIZE;

  const columns = Math.max(
    1,
    Math.floor((availableWidth + GAP) / (THUMBNAIL_SIZE + GAP)),
  );

  const cellSize = Math.max(
    THUMBNAIL_SIZE,
    (availableWidth - GAP * (columns - 1)) / columns,
  );

  const rowCount = Math.ceil(filteredFiles.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount || 0,
    getScrollElement: () => containerRef.current,
    estimateSize: () => cellSize + GAP,
    overscan: 4,
  });

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.defaultPrevented) {
        return;
      }

      const currentPath =
        selectedIndex !== null ? (files[selectedIndex]?.path ?? null) : null;

      const currentIndex = currentPath
        ? filteredPaths.indexOf(currentPath)
        : -1;

      const selectByIndex = (index: number) => {
        const path = filteredPaths[index];

        if (!path || path === currentPath) {
          return;
        }

        startScrubbing();
        handleSelectImageByPath(path);
      };

      let delta = 0;

      if (event.key === "ArrowLeft") {
        delta = -1;
      } else if (event.key === "ArrowRight") {
        delta = 1;
      }

      if (delta !== 0) {
        event.preventDefault();

        if (filteredPaths.length === 0) {
          return;
        }

        const baseIndex =
          currentIndex !== -1
            ? currentIndex
            : delta > 0
              ? -1
              : filteredPaths.length;
        const nextIndex = Math.min(
          Math.max(baseIndex + delta, 0),
          filteredPaths.length - 1,
        );

        if (nextIndex !== baseIndex) {
          selectByIndex(nextIndex);
        }
      } else if (event.key === "Home") {
        event.preventDefault();
        selectByIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        selectByIndex(filteredPaths.length - 1);
      }
    },
    [
      filteredPaths,
      handleSelectImageByPath,
      selectedIndex,
      files,
      startScrubbing,
    ],
  );

  useEffect(() => {
    virtualizer.measure();
  }, [columns, cellSize, filteredFiles.length, virtualizer]);

  useEffect(() => {
    if (!filteredFiles.length) return;

    const visibleRows = virtualizer.getVirtualItems().map((item) => item.index);

    if (!visibleRows.length) return;

    const minRow = Math.min(...visibleRows);
    const maxRow = Math.max(...visibleRows);
    const startRow = Math.max(0, minRow - PREFETCH_ROW_BUFFER);
    const endRow = Math.min(rowCount - 1, maxRow + PREFETCH_ROW_BUFFER);

    const visibleIndices = new Set<number>();

    visibleRows.forEach((rowIndex) => {
      const start = rowIndex * columns;

      for (let i = 0; i < columns; i += 1) {
        const index = start + i;

        if (index < filteredFiles.length) {
          visibleIndices.add(index);
        }
      }
    });

    const offScreenPaths: string[] = [];

    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
      const start = rowIndex * columns;

      for (let colIndex = 0; colIndex < columns; colIndex += 1) {
        const index = start + colIndex;

        if (index >= filteredFiles.length) {
          break;
        }

        if (visibleIndices.has(index)) {
          continue;
        }

        offScreenPaths.push(filteredFiles[index].path);
      }
    }

    if (!offScreenPaths.length) return;

    const timer = setTimeout(() => {
      prefetchThumbnails(offScreenPaths);
    }, 500);

    return () => clearTimeout(timer);
  }, [filteredFiles, virtualizer, columns, rowCount, prefetchThumbnails]);

  const selectedPath =
    selectedIndex !== null ? files[selectedIndex]?.path : null;

  useEffect(() => {
    if (!selectedPath || filteredFiles.length === 0) return;
    const index = filteredFiles.findIndex((file) => file.path === selectedPath);

    if (index >= 0) {
      virtualizer.scrollToIndex(Math.floor(index / columns), {
        align: "auto",
      });
      containerRef.current?.focus({ preventScroll: true });
    }
  }, [selectedPath, filteredFiles, virtualizer, columns]);

  const showEmptyState = filteredFiles.length === 0;

  return (
    <div className="h-full w-full">
      <div
        className={`w-full overflow-hidden transition-[max-height,opacity,transform] duration-200 ${
          isFilterOpen
            ? "max-h-24 opacity-100 translate-y-0 pointer-events-auto"
            : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
        }`}
        data-filter-ui="true"
      >
        <FilterMenuBar />
      </div>
      <div
        ref={containerRef}
        className="h-full overflow-y-auto px-4 pb-6"
        role="listbox"
        style={{ contain: "strict" }}
        tabIndex={filteredFiles.length > 0 ? 0 : -1}
        onKeyDown={handleKeyDown}
      >
        {showEmptyState ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            {hasBaseImages
              ? "No images match the current filters."
              : "No folder selected. Open a folder to start browsing thumbnails."}
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const startIndex = virtualRow.index * columns;
              const rowItems = filteredFiles.slice(
                startIndex,
                startIndex + columns,
              );

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                    height: `${cellSize + GAP}px`,
                    paddingBottom: `${GAP}px`,
                  }}
                >
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                      gridAutoRows: `${cellSize}px`,
                      gap: `${GAP}px`,
                    }}
                  >
                    {rowItems.map((file, columnIndex) => {
                      const isSelected = selectedPaths.has(file.path);
                      const index = startIndex + columnIndex;

                      return (
                        <GridItem
                          key={file.path}
                          file={file}
                          index={index}
                          isSelected={isSelected}
                          showFileExtensionInGrid={showFileExtensionInGrid}
                          showFileNameInGrid={showFileNameInGrid}
                          onSelect={(mode) => handleSelect(file.path, mode)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
