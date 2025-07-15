import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useState, useCallback } from "react";

import { Filmstrip } from "./components/filmstrip";
import { Header } from "./components/header";
import { ImageViewer } from "./components/image-viewer";
import { ImageMetadata } from "./types/image";

function App() {
  const [fileMetadataList, setfileMetadataList] = useState<ImageMetadata[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [currentImageData, setCurrentImageData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function getfileMetadataList() {
    const folderPath = await open({ directory: true });

    if (!folderPath || typeof folderPath !== "string") return;

    setIsLoading(true);

    try {
      const metadata_list: ImageMetadata[] = await invoke("get_file_metadata", {
        folderPath,
      });

      setfileMetadataList(metadata_list);

      setSelectedIndex(null);

      setCurrentImageData(null);
    } catch (error) {
      throw `Failed to load folder: ${error}`;
    } finally {
      setIsLoading(false);
    }
  }

  const handleSelectImage = useCallback(
    async (index: number) => {
      if (index < 0 || index >= fileMetadataList.length) return;

      setSelectedIndex(index);
      setIsLoading(true);
      try {
        const path = fileMetadataList[index].path;
        const result = await invoke("get_file", { imagePath: path });

        setCurrentImageData(result as string);
      } catch (error) {
        throw `Failed to load image: ${error}`;
      } finally {
        setIsLoading(false);
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
      <ImageViewer
        currentImageData={currentImageData}
        fileMetadataList={fileMetadataList}
        isLoading={isLoading}
        selectedIndex={selectedIndex}
      />
      <Filmstrip
        fileMetadataList={fileMetadataList}
        selectedIndex={selectedIndex}
        onSelectImage={handleSelectImage}
      />
    </div>
  );
}

export default App;
