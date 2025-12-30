import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { useImageKeyboardNavigation } from "../hooks/use-image-keyboard-navigation";
import { usePrefetchThumbnails } from "../hooks/use-thumbnails";

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

export function ThumbnailGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const lastWidthRef = useRef(0);
  const isSidebarResizing = useLayoutStore((state) => state.isSidebarResizing);
  const isSidebarResizingRef = useRef(isSidebarResizing);

  const { fileMetadataList } = useImageStore();
  const selectedPaths = useImageStore((state) => state.selectedPaths);
  const filteredFiles = useFilteredImages();
  const { handleSelectImageByPath } = useImageLoader();
  const handleSelect = useCallback(
    (path: string, selectionMode?: "single" | "multi") =>
      handleSelectImageByPath(path, selectionMode),
    [handleSelectImageByPath],
  );
  const prefetchThumbnails = usePrefetchThumbnails();
  const hasBaseImages = fileMetadataList.length > 0;
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

  useImageKeyboardNavigation(filteredPaths, filteredPaths.length > 0);

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
  }, []);

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

  useEffect(() => {
    virtualizer.measure();
  }, [columns, cellSize, filteredFiles.length, virtualizer]);

  useEffect(() => {
    if (!filteredFiles.length) return;

    const visibleRows = virtualizer.getVirtualItems().map((item) => item.index);

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

    const offScreenPaths = filteredFiles
      .map((file, idx) => ({ file, idx }))
      .filter(({ idx }) => !visibleIndices.has(idx))
      .map(({ file }) => file.path);

    if (!offScreenPaths.length) return;

    const timer = setTimeout(() => {
      prefetchThumbnails(offScreenPaths);
    }, 500);

    return () => clearTimeout(timer);
  }, [filteredFiles, virtualizer, columns, prefetchThumbnails]);

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
        style={{ contain: "strict" }}
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

                      return (
                        <GridItem
                          key={file.path}
                          file={file}
                          index={startIndex + columnIndex}
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
