import { useCallback, useEffect, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

import { useImageStore } from "@/store/image-store";
import { ImageMetadata } from "@/types/image";
import { useFileSystemStore } from "@/features/file-browser/store/file-system-store";
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

  const scanListenersRef = useRef<{
    batch?: UnlistenFn;
    complete?: UnlistenFn;
    error?: UnlistenFn;
  }>({});
  const pendingBatchRef = useRef<ImageMetadata[]>([]);
  const flushFrameRef = useRef<number | null>(null);

  const scheduleBatchFlush = useCallback(() => {
    if (flushFrameRef.current !== null) return;

    flushFrameRef.current = window.requestAnimationFrame(() => {
      flushFrameRef.current = null;

      if (!pendingBatchRef.current.length) return;

      const payload = pendingBatchRef.current;

      pendingBatchRef.current = [];
      appendFileMetadataList(payload);
    });
  }, [appendFileMetadataList]);

  const flushPendingBatch = useCallback(() => {
    if (flushFrameRef.current !== null) {
      cancelAnimationFrame(flushFrameRef.current);
      flushFrameRef.current = null;
    }

    if (!pendingBatchRef.current.length) return;

    const payload = pendingBatchRef.current;

    pendingBatchRef.current = [];
    appendFileMetadataList(payload);
  }, [appendFileMetadataList]);

  const cleanupScanListeners = useCallback(() => {
    scanListenersRef.current.batch?.();
    scanListenersRef.current.complete?.();
    scanListenersRef.current.error?.();
    scanListenersRef.current = {};
    if (flushFrameRef.current !== null) {
      cancelAnimationFrame(flushFrameRef.current);
      flushFrameRef.current = null;
    }
    pendingBatchRef.current = [];
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

      setFileMetadataList([]);
      setSelectedIndex(null);
      setCurrentImageData(null);
      setIsLoading(true);

      const batchListener = await listen<ImageMetadata[]>(
        "folder-scan-batch",
        ({ payload }) => {
          pendingBatchRef.current.push(...payload);
          scheduleBatchFlush();
        },
      );

      const completeListener = await listen("folder-scan-complete", () => {
        flushPendingBatch();
        setIsLoading(false);
        cleanupScanListeners();
      });

      const errorListener = await listen<string>(
        "folder-scan-error",
        ({ payload }) => {
          console.error("Folder scan failed:", payload);
          flushPendingBatch();
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
      cleanupScanListeners,
      flushPendingBatch,
      scheduleBatchFlush,
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
