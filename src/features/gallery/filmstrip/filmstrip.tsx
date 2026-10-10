import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useRef, useEffect, useMemo, useCallback } from "react";

import { usePrefetchThumbnails } from "../hooks/use-thumbnails";
import { useScrubbing } from "../hooks/use-scrubbing";

import { FilmstripItem } from "./filmstrip-item";

import {
  getFilteredImagePaths,
  useFilteredImages,
} from "@/features/filter/hooks/use-filtered-files";
import { useImageLoader } from "@/hooks/use-image-loader";
import {
  FILMSTRIP_GAP as GAP,
  FILMSTRIP_MAX_ITEM_SIZE,
  FILMSTRIP_MIN_ITEM_SIZE,
} from "@/store/layout-store";
import { useImageStore } from "@/store/image-store";

type Density = "thumb" | "meta" | "rating" | "full";
const PREFETCH_ITEM_BUFFER = 30;

function densityForSize(size: number): Density {
  if (size < 72) return "thumb";
  if (size < 104) return "meta";
  if (size < 136) return "rating";

  return "full";
}

type FilmstripProps = {
  height: number;
};

export const Filmstrip = memo(function Filmstrip({ height }: FilmstripProps) {
  const filmstripRef = useRef<HTMLDivElement>(null);
  const currentFolderPath = useImageStore((state) => state.currentFolderPath);
  const selectedPath = useImageStore((state) =>
    state.selectedIndex !== null
      ? (state.files[state.selectedIndex]?.path ?? null)
      : null,
  );
  const selectedPaths = useImageStore((state) => state.selectedPaths);
  const deselectAll = useImageStore((state) => state.deselectAll);
  const filteredFiles = useFilteredImages();
  const { handleSelectImageByPath } = useImageLoader();
  const prefetchThumbnails = usePrefetchThumbnails();
  const { startScrubbing } = useScrubbing();

  const activeFilteredIndex = selectedPath
    ? filteredFiles.findIndex((file) => file.path === selectedPath)
    : -1;
  const itemSize = Math.round(
    Math.max(
      FILMSTRIP_MIN_ITEM_SIZE,
      Math.min(FILMSTRIP_MAX_ITEM_SIZE, height - GAP * 2),
    ),
  );
  const density = useMemo(() => densityForSize(itemSize), [itemSize]);

  const filteredPaths = getFilteredImagePaths(filteredFiles);

  const virtualizer = useVirtualizer({
    horizontal: true,
    count: filteredFiles.length,
    getScrollElement: () => filmstripRef.current,
    estimateSize: () => itemSize + GAP,
    overscan: 5,
  });

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.defaultPrevented) {
        return;
      }

      const currentPath = selectedPath;

      const selectByIndex = (index: number) => {
        const path = filteredPaths[index];

        if (!path || path === currentPath) {
          return;
        }

        startScrubbing();
        handleSelectImageByPath(path);
      };

      if (event.key === "Home") {
        event.preventDefault();
        selectByIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        selectByIndex(filteredPaths.length - 1);
      } else if (event.key === " " && currentPath) {
        event.preventDefault();
        handleSelectImageByPath(currentPath, "multi");
      } else if (event.key === "Escape") {
        event.preventDefault();
        deselectAll();
      }
    },
    [
      filteredPaths,
      handleSelectImageByPath,
      selectedPath,
      startScrubbing,
      deselectAll,
    ],
  );

  useEffect(() => {
    if (filteredFiles.length > 0) {
      virtualizer.measure();
    }
  }, [filteredFiles.length, virtualizer, itemSize]);

  useEffect(() => {
    if (filteredFiles.length === 0) return;

    const visibleItems = virtualizer.getVirtualItems();

    if (!visibleItems.length) return;

    const visibleIndices = new Set(visibleItems.map((item) => item.index));
    const minIndex = Math.min(...visibleIndices);
    const maxIndex = Math.max(...visibleIndices);
    const startIndex = Math.max(0, minIndex - PREFETCH_ITEM_BUFFER);
    const endIndex = Math.min(
      filteredFiles.length - 1,
      maxIndex + PREFETCH_ITEM_BUFFER,
    );

    const offScreenPaths: string[] = [];

    for (let index = startIndex; index <= endIndex; index += 1) {
      if (visibleIndices.has(index)) {
        continue;
      }

      const file = filteredFiles[index];

      if (file) {
        offScreenPaths.push(file.path);
      }
    }

    if (!offScreenPaths.length) return;

    const timer = setTimeout(() => {
      prefetchThumbnails(offScreenPaths);
    }, 500);

    return () => clearTimeout(timer);
  }, [filteredFiles, virtualizer, prefetchThumbnails]);

  useEffect(() => {
    if (!selectedPath || filteredFiles.length === 0) return;
    const index = filteredFiles.findIndex((file) => file.path === selectedPath);

    if (index >= 0) {
      virtualizer.scrollToIndex(index, { align: "center" });
    }
  }, [selectedPath, filteredFiles, virtualizer]);

  useEffect(() => {
    const element = filmstripRef.current;

    if (!element) return;

    element.scrollLeft = 0;
    virtualizer.scrollToOffset(0);
  }, [currentFolderPath, virtualizer]);

  return (
    <div
      ref={filmstripRef}
      aria-activedescendant={
        activeFilteredIndex >= 0
          ? `filmstrip-option-${activeFilteredIndex}`
          : undefined
      }
      aria-label="Filmstrip"
      aria-multiselectable="true"
      className="h-full overflow-x-auto overflow-y-hidden px-2 pb-2"
      data-photo-navigation="true"
      role="listbox"
      style={{ contain: "strict" }}
      tabIndex={filteredFiles.length > 0 ? 0 : -1}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          width: `${virtualizer.getTotalSize()}px`,
          height: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const file = filteredFiles[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: `${itemSize}px`,
                height: `${itemSize}px`,
                transform: `translateX(${virtualItem.start}px)`,
              }}
            >
              <FilmstripItem
                density={density}
                file={file}
                index={virtualItem.index}
                isActive={file.path === selectedPath}
                isSelected={selectedPaths.has(file.path)}
                size={itemSize}
                onSelect={(selectionMode) => {
                  handleSelectImageByPath(file.path, selectionMode);
                  filmstripRef.current?.focus({ preventScroll: true });
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
