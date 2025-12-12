import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useEffect } from "react";

import { usePrefetchThumbnails } from "../hooks/use-thumbnails";
import { useImageKeyboardNavigation } from "../hooks/use-image-keyboard-navigation";

import { Thumbnail } from "./thumbnail";

import { useImageStore } from "@/store/image-store";
import { useImageLoader } from "@/hooks/use-image-loader";

const THUMBNAIL_SIZE = 60;
const GAP = 8;

export function Filmstrip() {
  const filmstripRef = useRef<HTMLDivElement>(null);
  const { fileMetadataList, selectedIndex } = useImageStore();
  const { handleSelectImage } = useImageLoader();
  const prefetchThumbnails = usePrefetchThumbnails();

  useImageKeyboardNavigation(fileMetadataList.length > 0);

  const virtualizer = useVirtualizer({
    horizontal: true,
    count: fileMetadataList.length,
    getScrollElement: () => filmstripRef.current,
    estimateSize: () => THUMBNAIL_SIZE + GAP,
    overscan: 5,
  });

  useEffect(() => {
    if (fileMetadataList.length > 0) {
      virtualizer.measure();
    }
  }, [fileMetadataList.length, virtualizer]);

  useEffect(() => {
    if (fileMetadataList.length === 0) return;

    const visibleIndices = new Set(
      virtualizer.getVirtualItems().map((item) => item.index),
    );

    const offScreenPaths = fileMetadataList
      .map((file, idx) => ({ file, idx }))
      .filter(({ idx }) => !visibleIndices.has(idx))
      .map(({ file }) => file.path);

    if (offScreenPaths.length > 0) {
      const timer = setTimeout(() => {
        prefetchThumbnails(offScreenPaths);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [fileMetadataList, virtualizer, prefetchThumbnails]);

  useEffect(() => {
    if (selectedIndex === null || fileMetadataList.length === 0) return;
    virtualizer.scrollToIndex(selectedIndex, { align: "center" });
  }, [selectedIndex, fileMetadataList.length, virtualizer]);

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
          const file = fileMetadataList[virtualItem.index];

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
              <Thumbnail
                index={virtualItem.index}
                isSelected={virtualItem.index === selectedIndex}
                path={file.path}
                onClick={() => handleSelectImage(virtualItem.index)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
