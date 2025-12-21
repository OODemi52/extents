import { useCallback } from "react";

import { useImageStore } from "../store/image-store";

export function useImageLoader() {
  const handleSelectImage = useCallback((index: number) => {
    const { fileMetadataList, selectedIndex, setSelectedIndex } =
      useImageStore.getState();

    if (index < 0 || index >= fileMetadataList.length) {
      console.warn(`Selected index ${index} is out of bounds.`);

      return;
    }
    if (selectedIndex === index) {
      return;
    }
    setSelectedIndex(index);
  }, []);

  const handleSelectImageByPath = useCallback(
    (path: string) => {
      const { fileMetadataList } = useImageStore.getState();
      const index = fileMetadataList.findIndex((file) => file.path === path);

      if (index === -1) {
        console.warn(`[image-loader] No file found for path ${path}`);

        return;
      }

      handleSelectImage(index);
    },
    [handleSelectImage],
  );

  return { handleSelectImage, handleSelectImageByPath };
}
