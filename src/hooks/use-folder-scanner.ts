import { useCallback, useEffect, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

import { useImageStore } from "@/store/image-store";
import { FileMetadata } from "@/types/image";
import { useFileSystemStore } from "@/features/file-browser/store/file-system-store";
import { useFilterStore } from "@/features/filter/stores/filter-store";
import { api } from "@/services/api";
import { getFilteredImagesFromState } from "@/features/filter/hooks/use-filtered-files";
import { useRatingStore } from "@/features/annotate/rating/store/use-rating-store";
import { useFlagStore } from "@/features/annotate/flagging/store/use-flagging-store";

export function useFolderScanner() {
  const {
    setFiles,
    appendFiles,
    setSelectedIndex,
    setCurrentImageData,
    setCurrentFolderPath,
    setIsLoading,
    selectSingleByIndex,
  } = useImageStore();

  const scanListenersRef = useRef<{
    batch?: UnlistenFn;
    complete?: UnlistenFn;
    error?: UnlistenFn;
  }>({});
  const pendingBatchRef = useRef<FileMetadata[]>([]);
  const flushFrameRef = useRef<number | null>(null);

  const scheduleBatchFlush = useCallback(() => {
    if (flushFrameRef.current !== null) return;

    flushFrameRef.current = window.requestAnimationFrame(() => {
      flushFrameRef.current = null;

      if (!pendingBatchRef.current.length) return;

      const payload = pendingBatchRef.current;

      pendingBatchRef.current = [];
      appendFiles(payload);
    });
  }, [appendFiles]);

  const flushPendingBatch = useCallback(() => {
    if (flushFrameRef.current !== null) {
      cancelAnimationFrame(flushFrameRef.current);
      flushFrameRef.current = null;
    }

    if (!pendingBatchRef.current.length) return;

    const payload = pendingBatchRef.current;

    pendingBatchRef.current = [];
    appendFiles(payload);
  }, [appendFiles]);

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

      setFiles([]);
      setSelectedIndex(null);
      setCurrentImageData(null);

      const loadingTimeout = setTimeout(() => {
        setIsLoading(true);
      }, 150);

      let isFirstBatch = true;

      const batchListener = await listen<FileMetadata[]>(
        "folder-scan-batch",
        ({ payload }) => {
          if (isFirstBatch && payload.length > 0) {
            isFirstBatch = false;
            appendFiles(payload);

            const ratings = useRatingStore.getState().ratings;
            const flags = useFlagStore.getState().flags;
            const filters = useFilterStore.getState();
            const filtered = getFilteredImagesFromState({
              files: payload,
              ratings,
              flags,
              filters,
            });

            if (filtered.length > 0) {
              selectSingleByIndex(0);
            }
          } else {
            pendingBatchRef.current.push(...payload);
            scheduleBatchFlush();
          }
        },
      );

      const completeListener = await listen("folder-scan-complete", () => {
        clearTimeout(loadingTimeout);
        flushPendingBatch();
        setIsLoading(false);
        cleanupScanListeners();

        const { files, selectedIndex } = useImageStore.getState();
        const ratings = useRatingStore.getState().ratings;
        const flags = useFlagStore.getState().flags;
        const filters = useFilterStore.getState();

        const filtered = getFilteredImagesFromState({
          files: files,
          ratings,
          flags,
          filters,
        });

        if (filtered.length > 0) {
          const firstPath = filtered[0].path;
          const selectedPath =
            selectedIndex !== null ? files[selectedIndex]?.path : null;

          if (firstPath !== selectedPath) {
            const indexInMainList = files.findIndex(
              (f) => f.path === firstPath,
            );

            if (indexInMainList !== -1) {
              selectSingleByIndex(indexInMainList);
            }
          }
        }
      });

      const errorListener = await listen<string>(
        "folder-scan-error",
        ({ payload }) => {
          clearTimeout(loadingTimeout);
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

      api.fs.startFolderScan({ folderPath }).catch((err) => {
        clearTimeout(loadingTimeout);
        console.error("Failed to start folder scan:", err);
        setIsLoading(false);
        cleanupScanListeners();
      });
    },
    [
      appendFiles,
      cleanupScanListeners,
      flushPendingBatch,
      scheduleBatchFlush,
      setCurrentFolderPath,
      setCurrentImageData,
      setFiles,
      setIsLoading,
      setSelectedIndex,
      selectSingleByIndex,
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
