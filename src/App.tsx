import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import { Header } from "./components/header";
import { Filmstrip } from "./components/filmstrip";
import { ImageViewer } from "./components/image-viewer";
import { useImageStore } from "./store/image-store";
import { ImageMetadata } from "./types/image";

function App() {
  const { setFiles, selectImage, setImageData, setLoading, fileMetadataList } =
    useImageStore();

  async function getfileMetadataList() {
    const folderPath = await open({ directory: true });

    if (!folderPath || typeof folderPath !== "string") return;

    setLoading(true);
    try {
      const metadataList: ImageMetadata[] = await invoke("get_file_metadata", {
        folderPath,
      });

      setFiles(metadataList);
      selectImage(0);
      setImageData("");
    } catch (err) {
      console.error("Failed to load folder", err);
    } finally {
      setLoading(false);
    }
  }
  const handleSelectImage = useCallback(
    async (index: number) => {
      if (index < 0 || index >= fileMetadataList.length) return;

      selectImage(index);
      setLoading(true);

      try {
        const result = await invoke("get_file", {
          imagePath: fileMetadataList[index].path,
        });

        setImageData(result as string);
      } catch (err) {
        console.error("Failed to load image", err);
      } finally {
        setLoading(false);
      }
    },
    [fileMetadataList],
  );

  return (
    <div className="flex flex-col h-screen">
      <Header
        hasImages={fileMetadataList.length > 0}
        onPickFolder={getfileMetadataList}
      />
      <ImageViewer />
      <Filmstrip onSelectImage={handleSelectImage} />
    </div>
  );
}

export default App;
