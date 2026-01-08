import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useEffect, useMemo, useState, useCallback } from "react";

import { usePrefetchThumbnails } from "../hooks/use-thumbnails";
import { useScrubbing } from "../hooks/use-scrubbing";

import { FilmstripItem } from "./filmstrip-item";

import { useFilteredImages } from "@/features/filter/hooks/use-filtered-files";
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

export function Filmstrip() {
  const filmstripRef = useRef<HTMLDivElement>(null);
  const [itemSize, setItemSize] = useState(72);
  const lastSizeRef = useRef(itemSize);
  const { files, selectedIndex, currentFolderPath } = useImageStore();
  const selectedPaths = useImageStore((state) => state.selectedPaths);
  const filteredFiles = useFilteredImages();
  const { handleSelectImageByPath } = useImageLoader();
  const prefetchThumbnails = usePrefetchThumbnails();
  const { startScrubbing } = useScrubbing();

  const selectedPath =
    selectedIndex !== null ? (files[selectedIndex]?.path ?? null) : null;
  const density = useMemo(() => densityForSize(itemSize), [itemSize]);

  const filteredPaths = useMemo(
    () => filteredFiles.map((file) => file.path),
    [filteredFiles],
  );

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

      const selectRelative = (delta: number) => {
        if (delta === 0 || filteredPaths.length === 0) {
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

        if (nextIndex === baseIndex) {
          return;
        }

        selectByIndex(nextIndex);
      };

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (event.metaKey || event.ctrlKey) {
          selectByIndex(0);
        } else {
          selectRelative(-1);
        }
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (event.metaKey || event.ctrlKey) {
          selectByIndex(filteredPaths.length - 1);
        } else {
          selectRelative(1);
        }
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
    const filmstrip = filmstripRef.current;

    if (!filmstrip) return;

    let frame = 0;
    let pendingHeight = 0;

    const updateSize = (height: number) => {
      const nextSize = Math.max(
        FILMSTRIP_MIN_ITEM_SIZE,
        Math.min(FILMSTRIP_MAX_ITEM_SIZE, height - GAP * 2),
      );

      if (Math.abs(nextSize - lastSizeRef.current) < 1) return;

      lastSizeRef.current = nextSize;
      setItemSize(nextSize);
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) return;

      pendingHeight = entry.contentRect.height;
      if (frame) return;

      frame = requestAnimationFrame(() => {
        frame = 0;
        updateSize(pendingHeight);
      });
    });

    observer.observe(filmstrip);

    return () => {
      observer.disconnect();
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, []);

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
      filmstripRef.current?.focus({ preventScroll: true });
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
      className="h-full overflow-x-auto overflow-y-hidden px-2 pb-2"
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
                isSelected={selectedPaths.has(file.path)}
                size={itemSize}
                onSelect={(selectionMode) =>
                  handleSelectImageByPath(file.path, selectionMode)
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
