import { useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

import { useImageStore } from "@/store/image-store";
import { useClearThumbnailCache } from "@/features/thumbnails/hooks/use-thumbnails";
import { ImageMetadata } from "@/types/image";

export function useFolderScanner() {
  const {
    setFileMetadataList,
    appendFileMetadataList,
    setSelectedIndex,
    setCurrentImageData,
    setIsLoading,
  } = useImageStore();

  const clearThumbnailCache = useClearThumbnailCache();

  const scanListenersRef = useRef<{
    batch?: UnlistenFn;
    complete?: UnlistenFn;
    error?: UnlistenFn;
  }>({});

  const cleanupScanListeners = useCallback(() => {
    scanListenersRef.current.batch?.();
    scanListenersRef.current.complete?.();
    scanListenersRef.current.error?.();
    scanListenersRef.current = {};
  }, []);

  const openFolder = useCallback(
    async (path: string | null = null) => {
      let folderPath: string | null = null;

      if (typeof path === "string" && path.length > 0) {
        folderPath = path;
      } else {
        folderPath = (await open({ directory: true })) as string | null;
      }

      if (!folderPath || typeof folderPath !== "string") return;

      // Clean up previous scan
      cleanupScanListeners();
      clearThumbnailCache();

      // Reset state
      setFileMetadataList([]);
      setSelectedIndex(null);
      setCurrentImageData(null);
      setIsLoading(true);

      const batchListener = await listen<ImageMetadata[]>(
        "folder-scan-batch",
        ({ payload }) => {
          const prevLength = useImageStore.getState().fileMetadataList.length;

          appendFileMetadataList(payload);

          // Select first image if this is the first batch
          if (prevLength === 0 && payload.length > 0) {
            setSelectedIndex(0);
            setCurrentImageData("");
          }
        },
      );

      const completeListener = await listen("folder-scan-complete", () => {
        console.log("Folder scan complete");
        setIsLoading(false);
        cleanupScanListeners();
      });

      const errorListener = await listen<string>(
        "folder-scan-error",
        ({ payload }) => {
          console.error("Folder scan failed:", payload);
          setIsLoading(false);
          cleanupScanListeners();
        },
      );

      scanListenersRef.current = {
        batch: batchListener,
        complete: completeListener,
        error: errorListener,
      };

      try {
        await invoke("start_folder_scan", { folderPath });
      } catch (err) {
        console.error("Failed to start folder scan:", err);
        setIsLoading(false);
        cleanupScanListeners();
      }
    },
    [
      appendFileMetadataList,
      cleanupScanListeners,
      clearThumbnailCache,
      setCurrentImageData,
      setFileMetadataList,
      setIsLoading,
      setSelectedIndex,
    ],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupScanListeners();
    };
  }, [cleanupScanListeners]);

  return { openFolder };
}
