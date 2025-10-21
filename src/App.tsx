import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import { Sidebar } from "./components/sidebar";
import { Filmstrip } from "./components/filmstrip";
import { ImageViewer } from "./components/image-viewer";
import { useImageStore } from "./store/image-store";
import { ImageMetadata } from "./types/image";
import { EditPanel } from "./components/edit-panel";

function App() {
  const {
    setFileMetadataList,
    setSelectedIndex,
    setCurrentImageData,
    setIsLoading,
    fileMetadataList,
  } = useImageStore();

  async function getfileMetadataList(path: string | null = null) {
    let folderPath: string | null = null;

    if (typeof path === "string" && path.length > 0) {
      folderPath = path;
    } else {
      folderPath = (await open({ directory: true })) as string | null;
    }

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
      alert(`Failed to load folder: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let animationFrameId: number;

    const loop = async () => {
      const shouldRender = await invoke("should_render_frame");
      console.log("Should Render: ", shouldRender);
      if (shouldRender) {
        const res = await invoke("render_frame");
        console.log("Render Frame: ", res);
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    const setPaused = () => invoke("set_render_state", { stateStr: "paused" });
    const setIdle = () => invoke("set_render_state", { stateStr: "idle" });

    window.addEventListener("blur", setPaused);
    window.addEventListener("focus", setIdle);

    return () => {
      window.removeEventListener("blur", setPaused);
      window.removeEventListener("focus", setIdle);
    };
  }, []);

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
      <EditPanel />
    </div>
  );
}

export default App;
