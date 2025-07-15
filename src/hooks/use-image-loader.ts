import { invoke } from "@tauri-apps/api/core";

import { useImageStore } from "../store/image-store";

export function useImageLoader() {
  const {
    fileMetadataList,
    setSelectedIndex,
    setIsLoading,
    setCurrentImageData,
  } = useImageStore();

  async function handleSelectImage(index: number) {
    if (index < 0 || index >= fileMetadataList.length) {
      return;
    }

    setSelectedIndex(index);
    setIsLoading(true);

    try {
      const result = await invoke("get_file", {
        imagePath: fileMetadataList[index].path,
      });

      setCurrentImageData(result as string);
    } catch (err) {
      console.error("Failed to load image", err);
    } finally {
      setIsLoading(false);
    }
  }

  return { handleSelectImage };
}
