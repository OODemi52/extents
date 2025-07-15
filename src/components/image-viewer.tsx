import { convertFileSrc } from "@tauri-apps/api/core";

import { useImageStore } from "../store/image-store";

export function ImageViewer() {
  const { fileMetadataList, selectedIndex, isLoading } = useImageStore();

  const selected =
    selectedIndex !== null ? fileMetadataList[selectedIndex] : null;

  return (
    <div className="flex-grow flex items-center justify-center p-4">
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10">
          Loading...
        </div>
      )}

      {selected?.path && (
        <img
          alt={selected.fileName}
          className="max-w-full max-h-full object-contain"
          src={convertFileSrc(selected.path)}
        />
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
