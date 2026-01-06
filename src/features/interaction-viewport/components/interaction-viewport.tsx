import { useRef, useEffect } from "react";

import { useImagePreview } from "../hooks/use-image-preview";
import { useViewportThumbnail } from "../hooks/use-viewport-thumbnail";
import { useImageTransform } from "../hooks/use-image-transform";
import { useViewportSync } from "../hooks/use-viewport-sync";
import { useInteractionHandlers } from "../hooks/use-interaction-handlers";

import { useImageStore } from "@/store/image-store";
import { FilterMenuBar } from "@/features/filter/components/menu-bar/menu-bar";
import { useFilterStore } from "@/features/filter/stores/filter-store";
import { useFilteredImages } from "@/features/filter/hooks/use-filtered-files";

export function InteractionViewport() {
  const { files, selectedIndex, isLoading, setSelectedIndex } = useImageStore();
  const isFilterOpen = useFilterStore((state) => state.isOpen);
  const filteredFiles = useFilteredImages();
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (files.length > 0 && selectedIndex === null) {
      setSelectedIndex(0);
    }
  }, [files, selectedIndex, setSelectedIndex]);

  const selected = selectedIndex !== null ? files[selectedIndex] : null;
  const imagePath = selected?.path || null;
  const isScrubbing = useImageStore((state) => state.isScrubbing);

  const {
    preview,
    isLoading: isPreviewLoading,
    error: previewError,
  } = useImagePreview(imagePath, {
    enabled: Boolean(imagePath) && !isScrubbing,
  });

  const { thumbnailPath } = useViewportThumbnail(imagePath);
  const { scale, offsetX, offsetY } = useImageTransform(imagePath);

  useViewportSync(
    viewportRef,
    preview,
    thumbnailPath,
    imagePath,
    isScrubbing,
    scale,
    offsetX,
    offsetY,
  );

  useInteractionHandlers(
    viewportRef,
    scale,
    offsetX,
    offsetY,
    Boolean(imagePath),
  );

  const showEmptyState = !imagePath && !isLoading && !isPreviewLoading;
  const showFilteredEmpty =
    !isLoading &&
    !isPreviewLoading &&
    filteredFiles.length === 0 &&
    files.length > 0;

  return (
    <div
      ref={viewportRef}
      className="w-full h-full relative flex flex-grow items-center justify-center bg-transparent p-4 touch-none"
    >
      <div
        className={`absolute top-0 left-0 w-full transition-all duration-200 ${
          isFilterOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        data-filter-ui="true"
      >
        <FilterMenuBar />
      </div>

      {isLoading && (
        <div className="absolute top-4 right-4 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-gray-300">
          Loading folder…
        </div>
      )}

      {previewError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <p className="rounded-lg bg-black bg-opacity-50 p-4 text-white">
            {previewError}
          </p>
        </div>
      )}

      {showEmptyState && !showFilteredEmpty && (
        <div className="text-center text-sm text-gray-500">
          {files.length
            ? "Select an image to view."
            : "No folder selected. Pick a folder to start."}
        </div>
      )}

      {showFilteredEmpty && (
        <div className="text-center text-sm text-gray-500">
          No images match the current filters.
        </div>
      )}
    </div>
  );
}
