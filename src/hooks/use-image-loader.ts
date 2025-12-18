import { useImageStore } from "../store/image-store";

export function useImageLoader() {
  const { setSelectedIndex, fileMetadataList, selectedIndex } = useImageStore();

  function handleSelectImage(index: number) {
    if (index < 0 || index >= fileMetadataList.length) {
      console.warn(`Selected index ${index} is out of bounds.`);

      return;
    }
    if (selectedIndex === index) {
      return;
    }
    setSelectedIndex(index);
  }

  function handleSelectImageByPath(path: string) {
    const index = fileMetadataList.findIndex((file) => file.path === path);

    if (index === -1) {
      console.warn(`[image-loader] No file found for path ${path}`);

      return;
    }

    handleSelectImage(index);
  }

  return { handleSelectImage, handleSelectImageByPath };
}
