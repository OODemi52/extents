import { convertFileSrc } from "@tauri-apps/api/core";

import { useImageStore } from "../store/image-store";

import { ImageCanvas } from "./image-canvas";

import { useImageEdits } from "@/store/image-edits";

export function ImageViewer() {
  const { fileMetadataList, selectedIndex, isLoading } = useImageStore();
  const selected =
    selectedIndex !== null ? fileMetadataList[selectedIndex] : null;

  const { brightness, contrast } = useImageEdits();

  return (
    <div className="flex-grow flex items-center justify-center p-4 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 backdrop-blur">
          Loading...
        </div>
      )}

      {selected?.path && (
        <div className="w-[600px] h-[400px] flex items-center justify-center">
          <ImageCanvas
            brightness={brightness}
            contrast={contrast}
            imageUrl={convertFileSrc(selected.path)}
          />
        </div>
      )}

      {!selected?.path && !isLoading && (
        <div className="text-gray-500">
          {fileMetadataList.length
            ? "Select an image to view"
            : "No folder selected"}
        </div>
      )}
    </div>
  );
}
