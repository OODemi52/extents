import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { useImageKeyboardNavigation } from "../hooks/use-image-keyboard-navigation";
import { usePrefetchThumbnails } from "../hooks/use-thumbnails";

import { Thumbnail } from "./thumbnail";

import { useImageLoader } from "@/hooks/use-image-loader";
import { useImageStore } from "@/store/image-store";

const THUMBNAIL_SIZE = 140;
const GAP = 12;

export function ThumbnailGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const { fileMetadataList, selectedIndex } = useImageStore();
  const { handleSelectImage } = useImageLoader();
  const prefetchThumbnails = usePrefetchThumbnails();

  useImageKeyboardNavigation(fileMetadataList.length > 0);

  useEffect(() => {
    const element = containerRef.current;

    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) return;

      setContainerWidth(entry.contentRect.width);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
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

  const rowCount = Math.ceil(fileMetadataList.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount || 0,
    getScrollElement: () => containerRef.current,
    estimateSize: () => cellSize + GAP,
    overscan: 4,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [columns, cellSize, fileMetadataList.length, virtualizer]);

  useEffect(() => {
    if (!fileMetadataList.length) return;

    const visibleRows = virtualizer.getVirtualItems().map((item) => item.index);
    const visibleIndices = new Set<number>();

    visibleRows.forEach((rowIndex) => {
      const start = rowIndex * columns;

      for (let i = 0; i < columns; i += 1) {
        const index = start + i;

        if (index < fileMetadataList.length) {
          visibleIndices.add(index);
        }
      }
    });

    const offScreenPaths = fileMetadataList
      .map((file, idx) => ({ file, idx }))
      .filter(({ idx }) => !visibleIndices.has(idx))
      .map(({ file }) => file.path);

    if (!offScreenPaths.length) return;

    const timer = setTimeout(() => {
      prefetchThumbnails(offScreenPaths);
    }, 500);

    return () => clearTimeout(timer);
  }, [fileMetadataList, virtualizer, columns, prefetchThumbnails]);

  const showEmptyState = fileMetadataList.length === 0;

  return (
    <div className="h-full w-full py-2">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto px-4 pb-6"
        style={{ contain: "strict" }}
      >
        {showEmptyState ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No folder selected. Open a folder to start browsing thumbnails.
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
              const rowItems = fileMetadataList.slice(
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
                      gap: `${GAP}px`,
                    }}
                  >
                    {rowItems.map((file, columnIndex) => {
                      const index = startIndex + columnIndex;
                      const isSelected = index === selectedIndex;

                      return (
                        <div
                          key={file.path}
                          className="relative"
                          title={file.fileName}
                        >
                          <Thumbnail
                            index={index}
                            isSelected={isSelected}
                            path={file.path}
                            onClick={() => handleSelectImage(index)}
                          />
                          <div className="pointer-events-none absolute inset-x-1 bottom-1 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white/90 backdrop-blur">
                            <div className="truncate">{file.fileName}</div>
                          </div>
                        </div>
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
