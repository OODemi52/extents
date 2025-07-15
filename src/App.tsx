import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import { Sidebar } from "./components/sidebar";
import { Filmstrip } from "./components/filmstrip";
import { ImageViewer } from "./components/image-viewer";
import { useImageStore } from "./store/image-store";
import { ImageMetadata } from "./types/image";

function App() {
  const {
    setFileMetadataList,
    setSelectedIndex,
    setCurrentImageData,
    setIsLoading,
    fileMetadataList,
  } = useImageStore();

  async function getfileMetadataList() {
    const folderPath = await open({ directory: true });

    if (!folderPath || typeof folderPath !== "string") return;

    setIsLoading(true);
    try {
      const metadataList: ImageMetadata[] = await invoke("get_file_metadata", {
        folderPath,
      });

      setFileMetadataList(metadataList);
      setSelectedIndex(0);
      setCurrentImageData("");
    } catch (err) {
      console.error("Failed to load folder", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        hasImages={fileMetadataList.length > 0}
        onPickFolder={getfileMetadataList}
      />
      <div className="flex flex-col flex-grow">
        <ImageViewer />
        <Filmstrip />
      </div>
    </div>
  );
}

export default App;
