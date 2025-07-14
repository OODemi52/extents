import { convertFileSrc } from "@tauri-apps/api/core";

interface ImageViewerProps {
  selectedIndex: number | null;
  currentImageData: string | null;
  isLoading: boolean;
  imagePaths: Array<{ file_name: string }>;
}

export function ImageViewer({
  selectedIndex,
  isLoading,
  imagePaths,
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
        imagePaths[selectedIndex] && (
          <img
            alt={imagePaths[selectedIndex]?.file_name || "Selected image"}
            className="max-w-full max-h-full object-contain"
            src={convertFileSrc(imagePaths[selectedIndex].file_name)}
          />
        )}

      {(selectedIndex === null ||
        (typeof selectedIndex === "number" && !imagePaths[selectedIndex])) &&
        !isLoading && (
          <div className="text-gray-500">
            {imagePaths.length
              ? "Select an image to view"
              : "No folder selected"}
          </div>
        )}
    </div>
  );
}
