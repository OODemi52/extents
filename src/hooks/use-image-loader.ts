import { useCallback } from "react";

import { useImageStore } from "../store/image-store";

export type SelectionMode = "single" | "multi";

export function useImageLoader() {
  const handleSelectImage = useCallback(
    (index: number, selectionMode: SelectionMode = "single") => {
      const {
        files,
        selectedIndex,
        selectedPaths,
        selectSingleByIndex,
        toggleSelectionByIndex,
      } = useImageStore.getState();

      if (index < 0 || index >= files.length) {
        console.warn(`Selected index ${index} is out of bounds.`);

        return;
      }

      if (selectionMode === "multi") {
        toggleSelectionByIndex(index);

        return;
      }

      const path = files[index]?.path;

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
      const { files } = useImageStore.getState();
      const index = files.findIndex((file) => file.path === path);

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
