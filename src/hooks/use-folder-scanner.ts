import { useCallback, useEffect, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { dirname } from "@tauri-apps/api/path";

import { useImageStore } from "@/store/image-store";
import { FileMetadata } from "@/types/image";
import { useFileSystemStore } from "@/features/file-browser/store/file-system-store";
import { useFilterStore } from "@/features/filter/stores/filter-store";
import { api } from "@/services/api";

const SUPPORTED_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "bmp",
  "tif",
  "tiff",
  "webp",
  "3fr",
  "ari",
  "arw",
  "cr2",
  "cr3",
  "crm",
  "crw",
  "dcr",
  "dcs",
  "dng",
  "erf",
  "fff",
  "iiq",
  "kdc",
  "mef",
  "mos",
  "mrw",
  "nef",
  "nrw",
  "orf",
  "ori",
  "pef",
  "qtk",
  "raf",
  "rw2",
  "rwl",
  "srw",
  "x3f",
];

const SCAN_PUBLISH_INTERVAL_MS = 50;

const normalizeDialogPath = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value === "object" && "path" in value) {
    const path = (value as { path?: unknown }).path;

    return typeof path === "string" ? path : null;
  }

  return null;
};

type FolderRequest = {
  folderPath: string;
  source: "picker" | "tree";
  initialFilePath: string | null;
};

type OpenFolder = (
  path?: string | null,
  source?: FolderRequest["source"],
  initialFilePath?: string | null,
) => Promise<void>;

export function useFolderScanner() {
  const setFiles = useImageStore((state) => state.setFiles);
  const appendFiles = useImageStore((state) => state.appendFiles);
  const setSelectedIndex = useImageStore((state) => state.setSelectedIndex);
  const setCurrentImageData = useImageStore(
    (state) => state.setCurrentImageData,
  );
  const setCurrentFolderPath = useImageStore(
    (state) => state.setCurrentFolderPath,
  );
  const setIsLoading = useImageStore((state) => state.setIsLoading);
  const setFolderScanError = useImageStore((state) => state.setFolderScanError);
  const selectSingleByIndex = useImageStore(
    (state) => state.selectSingleByIndex,
  );

  const lastOpenedFolder = useRef<string | null>(null);
  const prevSelectedIdRef = useRef<string | null>(null);
  const queuedFolderRequest = useRef<FolderRequest | null>(null);
  const openFolderRef = useRef<OpenFolder | null>(null);

  const pendingBatch = useRef<FileMetadata[]>([]);
  const flushTimer = useRef<number | null>(null);

  const schedulePendingBatch = useCallback(() => {
    if (flushTimer.current !== null) return;

    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = null;

      if (!pendingBatch.current.length) return;

      const payload = pendingBatch.current;

      pendingBatch.current = [];
      appendFiles(payload);
    }, SCAN_PUBLISH_INTERVAL_MS);
  }, [appendFiles]);

  const flushPendingBatch = useCallback(() => {
    if (flushTimer.current !== null) {
      clearTimeout(flushTimer.current);

      flushTimer.current = null;
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

    if (flushTimer.current !== null) {
      clearTimeout(flushTimer.current);

      flushTimer.current = null;
    }

    pendingBatch.current = [];
  }, []);
  const finishScan = useCallback(() => {
    setIsLoading(false);
    cleanupScanListeners();

    const nextRequest = queuedFolderRequest.current;

    queuedFolderRequest.current = null;

    if (!nextRequest) return;

    queueMicrotask(() => {
      void openFolderRef.current?.(
        nextRequest.folderPath,
        nextRequest.source,
        nextRequest.initialFilePath,
      );
    });
  }, [cleanupScanListeners, setIsLoading]);

  const openFolder: OpenFolder = useCallback(
    async (
      path: string | null = null,
      source: "picker" | "tree" = "picker",
      initialFilePath: string | null = null,
    ) => {
      const folderPath = normalizeDialogPath(
        path ?? (await open({ directory: true })),
      );

      if (!folderPath) return;

      if (useImageStore.getState().isLoading) {
        queuedFolderRequest.current =
          folderPath === lastOpenedFolder.current
            ? null
            : { folderPath, source, initialFilePath };

        return;
      }

      if (folderPath !== lastOpenedFolder.current) {
        useFilterStore.getState().clearFilters();
      }
      lastOpenedFolder.current = folderPath;
      setCurrentFolderPath(folderPath);
      setFolderScanError(null);
      setIsLoading(true);

      if (source === "picker") {
        useFileSystemStore.getState().selectItem(folderPath);
      }

      let isFirstBatch = true;
      let didSelectInitialFile = false;

      const selectInitialFile = (fallbackToFirst = false) => {
        const { files } = useImageStore.getState();
        let index = initialFilePath
          ? files.findIndex((file) => file.path === initialFilePath)
          : -1;

        if (index < 0 && fallbackToFirst) {
          index = 0;
        }

        if (index >= 0 && index < files.length) {
          selectSingleByIndex(index);
          didSelectInitialFile = true;
        }
      };

      try {
        scanListeners.current.batch = await listen<FileMetadata[]>(
          "folder-scan-batch",
          ({ payload }) => {
            if (!payload.length) return;

            if (isFirstBatch) {
              isFirstBatch = false;
              setFiles(payload);
              selectInitialFile(!initialFilePath);
            } else {
              pendingBatch.current.push(...payload);

              if (
                initialFilePath &&
                payload.some((file) => file.path === initialFilePath)
              ) {
                flushPendingBatch();
                selectInitialFile();
              } else {
                schedulePendingBatch();
              }
            }
          },
        );

        scanListeners.current.total = await listen<number>(
          "folder-total",
          ({ payload }) => {
            if (payload === 0) {
              setFiles([]);
              setSelectedIndex(null);
              setCurrentImageData(null);
            }
          },
        );

        scanListeners.current.complete = await listen(
          "folder-scan-complete",
          () => {
            flushPendingBatch();

            if (initialFilePath && !didSelectInitialFile) {
              selectInitialFile(true);
            }

            finishScan();
          },
        );

        scanListeners.current.error = await listen<string>(
          "folder-scan-error",
          ({ payload }) => {
            console.error("Folder scan failed:", payload);
            flushPendingBatch();
            setFolderScanError("This folder could not be scanned.");
            finishScan();
          },
        );

        await api.fs.startFolderScan({ folderPath });
      } catch (error) {
        console.error("Failed to start folder scan:", error);
        setFolderScanError("This folder could not be scanned.");
        finishScan();
      }
    },
    [
      appendFiles,
      cleanupScanListeners,
      finishScan,
      flushPendingBatch,
      schedulePendingBatch,
      setCurrentFolderPath,
      setCurrentImageData,
      setFolderScanError,
      setFiles,
      setIsLoading,
      setSelectedIndex,
      selectSingleByIndex,
    ],
  );

  useEffect(() => {
    openFolderRef.current = openFolder;

    return () => {
      openFolderRef.current = null;
    };
  }, [openFolder]);

  const openFile = useCallback(async () => {
    const selectedPath = normalizeDialogPath(
      await open({
        directory: false,
        multiple: false,
        filters: [
          {
            name: "Supported photos",
            extensions: SUPPORTED_IMAGE_EXTENSIONS,
          },
        ],
      }),
    );

    if (!selectedPath) return;

    const folderPath = await dirname(selectedPath);

    await openFolder(folderPath, "picker", selectedPath);
  }, [openFolder]);

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
    return () => {
      queuedFolderRequest.current = null;
      cleanupScanListeners();
    };
  }, [cleanupScanListeners]);

  return { openFile, openFolder };
}
