import { useRef } from "react";

import { useImagePreview } from "../hooks/use-image-preview";
import { useImageTransform } from "../hooks/use-image-transform";
import { useViewportSync } from "../hooks/use-viewport-sync";
import { useInteractionHandlers } from "../hooks/use-interaction-handlers";

import { useImageStore } from "@/store/image-store";

export function InteractionViewport() {
  const { fileMetadataList, selectedIndex, isLoading } = useImageStore();

  const viewportRef = useRef<HTMLDivElement>(null);

  const selected =
    selectedIndex !== null ? fileMetadataList[selectedIndex] : null;

  const imagePath = selected?.path || null;

  const {
    preview,
    isLoading: isPreviewLoading,
    error: previewError,
  } = useImagePreview(imagePath);

  const { scale, offsetX, offsetY } = useImageTransform(imagePath);

  useViewportSync(viewportRef, preview, scale, offsetX, offsetY);

  useInteractionHandlers(viewportRef, scale, offsetX, offsetY);

  const showEmptyState = !imagePath && !isLoading && !isPreviewLoading;

  return (
    <div
      ref={viewportRef}
      className="w-full h-full relative flex flex-grow items-center justify-center bg-transparent p-4 touch-none"
    >
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

      {showEmptyState && (
        <div className="text-center text-sm text-gray-500">
          {fileMetadataList.length
            ? "Select an image to view."
            : "No folder selected. Pick a folder to start."}
        </div>
      )}
    </div>
  );
}
