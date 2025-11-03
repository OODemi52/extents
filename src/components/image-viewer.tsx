import { useMemo } from "react";

import { useImageStore } from "../store/image-store";

const DISABLED_MESSAGE =
  "Full-size preview temporarily disabled while we focus on thumbnail performance.";

export function ImageViewer() {
  const { fileMetadataList, selectedIndex, isLoading } = useImageStore();

  const selectedPath = useMemo(() => {
    if (selectedIndex === null) return null;

    return fileMetadataList[selectedIndex]?.path ?? null;
  }, [fileMetadataList, selectedIndex]);

  return (
    <div className="flex-grow flex items-center justify-center p-4 relative bg-transparent touch-none">
      {selectedPath ? (
        <div className="text-gray-400 text-sm text-center max-w-md">
          {DISABLED_MESSAGE}
        </div>
      ) : (
        <div className="text-gray-500 text-sm text-center">
          {fileMetadataList.length
            ? "Select a thumbnail to continue."
            : "No folder selected. Pick a folder to start."}
        </div>
      )}

      {isLoading && (
        <div className="absolute top-4 right-4 text-xs font-medium text-gray-300 bg-black/60 px-3 py-1 rounded-full">
          Loading folder…
        </div>
      )}
    </div>
  );
}
