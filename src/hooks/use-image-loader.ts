import { useImageStore } from "../store/image-store";

export function useImageLoader() {
  const { setSelectedIndex, fileMetadataList } = useImageStore();

  function handleSelectImage(index: number) {
    if (index < 0 || index >= fileMetadataList.length) {
      console.warn(`Selected index ${index} is out of bounds.`);

      return;
    }
    setSelectedIndex(index);
  }

  return { handleSelectImage };
}
