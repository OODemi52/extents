import { useCallback } from "react";

import { useImageStore } from "../store/image-store";

export type SelectionMode = "single" | "multi";

export function useImageLoader() {
  const handleSelectImage = useCallback(
    (index: number, selectionMode: SelectionMode = "single") => {
      const {
        fileMetadataList,
        selectedIndex,
        selectedPaths,
        selectSingleByIndex,
        toggleSelectionByIndex,
      } = useImageStore.getState();

      if (index < 0 || index >= fileMetadataList.length) {
        console.warn(`Selected index ${index} is out of bounds.`);

        return;
      }

      if (selectionMode === "multi") {
        toggleSelectionByIndex(index);

        return;
      }

      const path = fileMetadataList[index]?.path;

      if (
        selectedIndex === index &&
        path &&
        selectedPaths.size === 1 &&
        selectedPaths.has(path)
      ) {
        return;
      }

      selectSingleByIndex(index);
    },
    [],
  );

  const handleSelectImageByPath = useCallback(
    (path: string, selectionMode: SelectionMode = "single") => {
      const { fileMetadataList } = useImageStore.getState();
      const index = fileMetadataList.findIndex((file) => file.path === path);

      if (index === -1) {
        console.warn(`[image-loader] No file found for path ${path}`);

        return;
      }

      handleSelectImage(index, selectionMode);
    },
    [handleSelectImage],
  );

  return { handleSelectImage, handleSelectImageByPath };
}
