import { convertFileSrc } from "@tauri-apps/api/core";

import { ImageMetadata } from "@/types/image";

interface ImageViewerProps {
  selectedIndex: number | null;
  currentImageData: string | null;
  isLoading: boolean;
  fileMetadataList: ImageMetadata[];
}

export function ImageViewer({
  selectedIndex,
  isLoading,
  fileMetadataList,
}: ImageViewerProps) {
  return (
    <div className="flex-grow flex items-center justify-center p-4">
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10">
          Loading...
        </div>
      )}

      {selectedIndex !== null &&
        typeof selectedIndex === "number" &&
        fileMetadataList[selectedIndex].path && (
          <img
            alt={fileMetadataList[selectedIndex]?.fileName || "Selected image"}
            className="max-w-full max-h-full object-contain"
            src={convertFileSrc(fileMetadataList[selectedIndex].fileName)}
          />
        )}

      {(selectedIndex === null ||
        (typeof selectedIndex === "number" &&
          !fileMetadataList[selectedIndex])) &&
        !isLoading && (
          <div className="text-gray-500">
            {fileMetadataList.length
              ? "Select an image to view"
              : "No folder selected"}
          </div>
        )}
    </div>
  );
}
