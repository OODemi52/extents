import { useCallback, useEffect, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

import { useImageStore } from "@/store/image-store";
import { ImageMetadata } from "@/types/image";
import { useFileSystemStore } from "@/features/file-browser/store/file-system-store";
import { useClearThumbnailCache } from "@/features/gallery/hooks/use-thumbnails";
import { useFilterStore } from "@/features/filter/stores/filter-store";
import { api } from "@/services/api";

export function useFolderScanner() {
  const {
    setFileMetadataList,
    appendFileMetadataList,
    setSelectedIndex,
    setCurrentImageData,
    setCurrentFolderPath,
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

  const lastOpenedFolderRef = useRef<string | null>(null);
  const prevSelectedIdRef = useRef<string | null>(null);

  const openFolder = useCallback(
    async (path: string | null = null) => {
      let folderPath: string | null = null;

      if (typeof path === "string" && path.length > 0) {
        folderPath = path;
      } else {
        folderPath = (await open({ directory: true })) as string | null;
      }

      if (!folderPath || typeof folderPath !== "string") return;

      const wasProvidedPath = typeof path === "string" && path.length > 0;

      if (folderPath !== lastOpenedFolderRef.current) {
        useFilterStore.getState().clearFilters();
      }

      lastOpenedFolderRef.current = folderPath;
      setCurrentFolderPath(folderPath);

      if (!wasProvidedPath) {
        useFileSystemStore.getState().selectItem(folderPath);
      }

      cleanupScanListeners();
      clearThumbnailCache();

      setFileMetadataList([]);
      setSelectedIndex(null);
      setCurrentImageData(null);
      setIsLoading(true);

      const batchListener = await listen<ImageMetadata[]>(
        "folder-scan-batch",
        ({ payload }) => {
          const prevLength = useImageStore.getState().fileMetadataList.length;

          appendFileMetadataList(payload);

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
        await api.fs.startFolderScan({ folderPath });
      } catch (err) {
        console.error("Failed to start folder scan:", err);
        setIsLoading(false);
        cleanupScanListeners();
      }
    },
    [
      appendFileMetadataList,
      clearThumbnailCache,
      cleanupScanListeners,
      setCurrentFolderPath,
      setCurrentImageData,
      setFileMetadataList,
      setIsLoading,
      setSelectedIndex,
    ],
  );

  useEffect(() => {
    const unsubscribe = useFileSystemStore.subscribe((state) => {
      const { selectedId } = state;
      const currentSelected =
        typeof selectedId === "string" && selectedId.length > 0
          ? selectedId
          : null;

      if (
        currentSelected &&
        currentSelected !== prevSelectedIdRef.current &&
        currentSelected !== lastOpenedFolderRef.current
      ) {
        prevSelectedIdRef.current = currentSelected;
        openFolder(currentSelected);

        return;
      }

      prevSelectedIdRef.current = currentSelected;
    });

    return () => {
      unsubscribe();
    };
  }, [openFolder]);

  useEffect(() => {
    return () => {
      cleanupScanListeners();
    };
  }, [cleanupScanListeners]);

  return { openFolder };
}
