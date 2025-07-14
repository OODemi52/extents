import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useState, useCallback } from "react";

import { Filmstrip } from "./components/filmstrip";
import { Header } from "./components/header";
import { ImageViewer } from "./components/image-viewer";
import { ImageMetadata } from "./types/image";
import { ImageMetadataResponse } from "./types/repsonse";

function App() {
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [currentImageData, setCurrentImageData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function pickFolderAndListImages() {
    const folderPath = await open({ directory: true });

    if (!folderPath || typeof folderPath !== "string") return;

    setIsLoading(true);

    try {
      const metadata_list: ImageMetadataResponse[] = await invoke(
        "get_file_metadata",
        { folderPath },
      );

      metadata_list.map((metadata) => imagePaths.push(metadata.path));

      setImagePaths(imagePaths);

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
      if (index < 0 || index >= imagePaths.length) return;

      setSelectedIndex(index);
      setIsLoading(true);
      try {
        const path = imagePaths[index].path;
        const result = await invoke("get_file", { imagePath: path });

        setCurrentImageData(result as string);
      } catch (error) {
        throw `Failed to load image: ${error}`;
      } finally {
        setIsLoading(false);
      }
    },
    [imagePaths],
  );

  const getThumbnailForImage = useCallback(async (path: string) => {
    // Take in file path
    // Create unique hash/id
    // Use to cache and recall
    try {
      const thumbPath: string = await invoke("get_thumbnail_path", {
        imagePath: path,
        maxSize: 100,
      });
      const convertedThumbPath: string = convertFileSrc(thumbPath);

      return convertedThumbPath;
    } catch (error) {
      //add better handling
      console.error(`Failed to get thumbnail for ${path}:`, error);
      return null;
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <Header
        hasImages={imagePaths.length > 0}
        onPickFolder={pickFolderAndListImages}
      />
      <ImageViewer
        currentImageData={currentImageData}
        imagePaths={imagePaths}
        isLoading={isLoading}
        selectedIndex={selectedIndex}
      />
      <Filmstrip
        getThumbnailForImage={getThumbnailForImage}
        imagePaths={imagePaths}
        selectedIndex={selectedIndex}
        onSelectImage={handleSelectImage}
      />
    </div>
  );
}

export default App;
