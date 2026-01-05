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

  const lastOpenedFolder = useRef<string | null>(null);
  const prevSelectedIdRef = useRef<string | null>(null);

  const pendingBatch = useRef<FileMetadata[]>([]);
  const flushFrame = useRef<number | null>(null);

  const schedulePendingBatch = useCallback(() => {
    if (flushFrame.current !== null) return;

    flushFrame.current = window.requestAnimationFrame(() => {
      flushFrame.current = null;

      if (!pendingBatch.current.length) return;

      const payload = pendingBatch.current;

      pendingBatch.current = [];
      appendFiles(payload);
    });
  }, [appendFiles]);

  const flushPendingBatch = useCallback(() => {
    if (flushFrame.current !== null) {
      cancelAnimationFrame(flushFrame.current);

      flushFrame.current = null;
    }

    if (!pendingBatch.current.length) return;

    const payload = pendingBatch.current;

    pendingBatch.current = [];
    appendFiles(payload);
  }, [appendFiles]);

  const scanListeners = useRef<{
    batch?: UnlistenFn;
    complete?: UnlistenFn;
    error?: UnlistenFn;
    total?: UnlistenFn;
  }>({});
  const cleanupScanListeners = useCallback(() => {
    scanListeners.current.batch?.();

    scanListeners.current.complete?.();

    scanListeners.current.error?.();

    scanListeners.current.total?.();

    scanListeners.current = {};

    if (flushFrame.current !== null) {
      cancelAnimationFrame(flushFrame.current);

      flushFrame.current = null;
    }

    pendingBatch.current = [];
  }, []);

  const normalizeFolderPath = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value[0] ?? null;
    if (typeof value === "object" && "path" in value) {
      return (value as any).path;
    }

    return null;
  };

  const openFolder = useCallback(
    async (
      path: string | null = null,
      source: "picker" | "tree" = "picker",
    ) => {
      const folderPath = normalizeFolderPath(
        path ?? (await open({ directory: true })),
      );

      if (!folderPath) return;

      if (folderPath !== lastOpenedFolder.current) {
        useFilterStore.getState().clearFilters();
      }
      lastOpenedFolder.current = folderPath;
      setCurrentFolderPath(folderPath);

      if (source === "picker") {
        useFileSystemStore.getState().selectItem(folderPath);
      }

      let isFirstBatch = true;

      const batchListener = await listen<FileMetadata[]>(
        "folder-scan-batch",
        ({ payload }) => {
          if (!payload.length) return;

          if (isFirstBatch) {
            isFirstBatch = false;

            setFiles(payload);

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
            pendingBatch.current.push(...payload);
            schedulePendingBatch();
          }
        },
      );

      const totalCountListener = await listen<number>(
        "folder-total",
        ({ payload }) => {
          if (payload === 0) {
            setFiles([]);
            setIsLoading(false);
          }
          // Use this to implement immediate perceptual load of folder later (i.e. loading skeletons)
        },
      );

      const scanCompleteListener = await listen("folder-scan-complete", () => {
        flushPendingBatch();
        setIsLoading(false);
        cleanupScanListeners();
      });

      const scanErrorListener = await listen<string>(
        "folder-scan-error",
        ({ payload }) => {
          console.error("Folder scan failed:", payload);
          flushPendingBatch();
          setIsLoading(false);
          cleanupScanListeners();
        },
      );

      scanListeners.current = {
        batch: batchListener,
        complete: scanCompleteListener,
        error: scanErrorListener,
        total: totalCountListener,
      };

      api.fs.startFolderScan({ folderPath }).catch((err) => {
        console.error("Failed to start folder scan:", err);
        setIsLoading(false);
        cleanupScanListeners();
      });
    },
    [
      appendFiles,
      cleanupScanListeners,
      flushPendingBatch,
      schedulePendingBatch,
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
      const currentSelected =
        state.selectedId && state.selectedId.length > 0
          ? state.selectedId
          : null;

      if (
        currentSelected &&
        currentSelected !== prevSelectedIdRef.current &&
        currentSelected !== lastOpenedFolder.current
      ) {
        prevSelectedIdRef.current = currentSelected;
        openFolder(currentSelected);
      }
      prevSelectedIdRef.current = currentSelected;
    });

    return () => unsubscribe();
  }, [openFolder]);

  useEffect(() => {
    return () => cleanupScanListeners();
  }, [cleanupScanListeners]);

  return { openFolder };
}
