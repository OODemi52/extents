import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useEffect } from "react";

import { usePrefetchThumbnails } from "../hooks/use-thumbnails";
import { useImageKeyboardNavigation } from "../hooks/use-image-keyboard-navigation";

import { FilmstripItem } from "./filmstrip-item";

import { useImageStore } from "@/store/image-store";
import { useFilteredImages } from "@/features/filter/hooks/use-filtered-files";
import { useImageLoader } from "@/hooks/use-image-loader";

const THUMBNAIL_SIZE = 60;
const GAP = 8;

export function Filmstrip() {
  const filmstripRef = useRef<HTMLDivElement>(null);
  const { fileMetadataList, selectedIndex } = useImageStore();
  const filteredFiles = useFilteredImages();
  const { handleSelectImageByPath } = useImageLoader();
  const prefetchThumbnails = usePrefetchThumbnails();

  const selectedPath =
    selectedIndex !== null
      ? (fileMetadataList[selectedIndex]?.path ?? null)
      : null;

  useImageKeyboardNavigation(filteredFiles.length > 0);

  const virtualizer = useVirtualizer({
    horizontal: true,
    count: filteredFiles.length,
    getScrollElement: () => filmstripRef.current,
    estimateSize: () => THUMBNAIL_SIZE + GAP,
    overscan: 5,
  });

  useEffect(() => {
    if (filteredFiles.length > 0) {
      virtualizer.measure();
    }
  }, [filteredFiles.length, virtualizer]);

  useEffect(() => {
    if (filteredFiles.length === 0) return;

    const visibleIndices = new Set(
      virtualizer.getVirtualItems().map((item) => item.index),
    );

    const offScreenPaths = filteredFiles
      .map((file, index) => ({ file, index }))
      .filter(({ index }) => !visibleIndices.has(index))
      .map(({ file }) => file.path);

    if (offScreenPaths.length > 0) {
      const timer = setTimeout(() => {
        prefetchThumbnails(offScreenPaths);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [filteredFiles, virtualizer, prefetchThumbnails]);

  useEffect(() => {
    if (!selectedPath || filteredFiles.length === 0) return;
    const index = filteredFiles.findIndex((file) => file.path === selectedPath);

    if (index >= 0) {
      virtualizer.scrollToIndex(index, { align: "center" });
    }
  }, [selectedPath, filteredFiles, virtualizer]);

  return (
    <div
      ref={filmstripRef}
      className="h-24 overflow-x-auto overflow-y-hidden p-2 pb-4"
      style={{ contain: "strict" }}
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
                top: 0,
                left: 0,
                width: `${THUMBNAIL_SIZE}px`,
                height: `${THUMBNAIL_SIZE}px`,
                transform: `translateX(${virtualItem.start}px)`,
              }}
            >
              <FilmstripItem
                file={file}
                index={virtualItem.index}
                isSelected={file.path === selectedPath}
                onSelect={() => handleSelectImageByPath(file.path)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
