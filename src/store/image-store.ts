import { create } from "zustand";
import { convertFileSrc } from "@tauri-apps/api/core";

import { FileMetadata } from "../types/image";

import { useImageTransformStore } from "./transform-store";

interface ImageStore {
  fileMetadataList: FileMetadata[];
  selectedIndex: number | null;
  selectedPaths: Set<string>;
  currentImageData: string | null;
  isLoading: boolean;
  isScrubbing: boolean;

  currentFolderPath: string | null;
  folderList: string[];

  setFileMetadataList: (list: FileMetadata[]) => void;
  appendFileMetadataList: (list: FileMetadata[]) => void;
  setSelectedIndex: (index: number | null) => void;
  selectSingleByIndex: (index: number) => void;
  toggleSelectionByIndex: (index: number) => void;
  selectRelative: (delta: number) => void;
  selectFirst: () => void;
  selectLast: () => void;
  selectAll: (paths: string[]) => void;
  selectInverse: (paths: string[]) => void;
  deselectAll: () => void;
  setCurrentImageData: (data: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsScrubbing: (scrubbing: boolean) => void;
  setThumbnailPath: (originalPath: string, cachePath: string) => void;

  setCurrentFolderPath: (path: string | null) => void;
  setFolderList: (folders: string[]) => void;
}

type ImageSelectionState = Pick<
  ImageStore,
  "fileMetadataList" | "selectedIndex" | "selectedPaths"
>;

type ImageIndexState = Pick<ImageStore, "fileMetadataList" | "selectedIndex">;

const getPathAtIndex = (state: ImageSelectionState, index: number) =>
  state.fileMetadataList[index]?.path ?? null;

const resetTransformIfChanged = (
  state: ImageSelectionState,
  nextIndex: number,
) => {
  if (nextIndex !== state.selectedIndex) {
    useImageTransformStore.getState().resetTransform();
  }
};

const findIndexByPath = (
  state: Pick<ImageStore, "fileMetadataList">,
  path: string,
) => state.fileMetadataList.findIndex((file) => file.path === path);

const getRelativeIndex = (state: ImageIndexState, delta: number) => {
  const total = state.fileMetadataList.length;

  if (total === 0 || delta === 0) {
    return null;
  }

  const current =
    state.selectedIndex !== null ? state.selectedIndex : delta > 0 ? -1 : total;
  const next = Math.min(Math.max(current + delta, 0), total - 1);

  if (next === state.selectedIndex) {
    return null;
  }

  return next;
};

export const useImageStore = create<ImageStore>((set, get) => {
  const selectSingleByIndex = (index: number) => {
    set((state) => {
      const path = getPathAtIndex(state, index);

      if (!path) {
        return {};
      }

      const isAlreadySelected =
        state.selectedIndex === index &&
        state.selectedPaths.size === 1 &&
        state.selectedPaths.has(path);

      if (isAlreadySelected) {
        return {};
      }

      resetTransformIfChanged(state, index);

      return { selectedIndex: index, selectedPaths: new Set([path]) };
    });
  };

  const toggleSelectionByIndex = (index: number) => {
    set((state) => {
      const path = getPathAtIndex(state, index);

      if (!path) {
        return {};
      }

      const nextSelected = new Set(state.selectedPaths);

      if (nextSelected.has(path)) {
        nextSelected.delete(path);
      } else {
        nextSelected.add(path);
      }

      return { selectedPaths: nextSelected };
    });
  };

  const setActiveIndexFromPath = (state: ImageSelectionState, path: string) => {
    const index = findIndexByPath(state, path);

    if (index < 0) {
      return null;
    }

    resetTransformIfChanged(state, index);

    return index;
  };

  return {
    fileMetadataList: [],
    selectedIndex: null,
    selectedPaths: new Set(),
    currentImageData: null,
    isLoading: false,
    isScrubbing: false,

    currentFolderPath: null,
    folderList: [],

    setFileMetadataList: (list) =>
      set((state) => {
        const nextPaths = new Set(list.map((file) => file.path));
        const nextSelectedPaths = new Set(
          [...state.selectedPaths].filter((path) => nextPaths.has(path)),
        );

        return { fileMetadataList: list, selectedPaths: nextSelectedPaths };
      }),
    appendFileMetadataList: (list) =>
      set((state) => ({
        fileMetadataList: [...state.fileMetadataList, ...list],
      })),
    setSelectedIndex: (index: number | null) => {
      if (index === null) {
        set({ selectedIndex: null, selectedPaths: new Set() });

        return;
      }

      set((state) => {
        if (index < 0 || index >= state.fileMetadataList.length) {
          return {};
        }

        if (index === state.selectedIndex) {
          return {};
        }

        resetTransformIfChanged(state, index);

        return { selectedIndex: index };
      });
    },
    selectSingleByIndex,
    toggleSelectionByIndex,
    selectRelative: (delta: number) => {
      const nextIndex = getRelativeIndex(get(), delta);

      if (nextIndex !== null) {
        selectSingleByIndex(nextIndex);
      }
    },
    selectFirst: () => {
      const { fileMetadataList, selectedIndex } = get();

      if (!fileMetadataList.length || selectedIndex === 0) {
        return;
      }

      selectSingleByIndex(0);
    },
    selectLast: () => {
      const { fileMetadataList, selectedIndex } = get();
      const lastIndex = fileMetadataList.length - 1;

      if (!fileMetadataList.length || selectedIndex === lastIndex) {
        return;
      }

      selectSingleByIndex(lastIndex);
    },
    selectAll: (paths) => {
      if (!paths.length) {
        return;
      }

      set((state) => {
        const nextSelected = new Set(paths);
        let nextIndex = state.selectedIndex;

        if (nextIndex === null) {
          const firstPath = paths[0];
          const index = setActiveIndexFromPath(state, firstPath);

          if (index !== null) {
            nextIndex = index;
          }
        }

        return { selectedIndex: nextIndex, selectedPaths: nextSelected };
      });
    },
    selectInverse: (paths) => {
      if (!paths.length) {
        return;
      }

      set((state) => {
        const nextSelected = new Set(state.selectedPaths);

        for (const path of paths) {
          if (nextSelected.has(path)) {
            nextSelected.delete(path);
          } else {
            nextSelected.add(path);
          }
        }

        let nextIndex = state.selectedIndex;

        if (nextIndex === null && nextSelected.size > 0) {
          const firstSelected = paths.find((path) => nextSelected.has(path));

          if (firstSelected) {
            const index = setActiveIndexFromPath(state, firstSelected);

            if (index !== null) {
              nextIndex = index;
            }
          }
        }

        return { selectedIndex: nextIndex, selectedPaths: nextSelected };
      });
    },
    deselectAll: () =>
      set((state) =>
        state.selectedPaths.size ? { selectedPaths: new Set() } : {},
      ),
    setCurrentImageData: (data) => set({ currentImageData: data }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setIsScrubbing: (scrubbing) => set({ isScrubbing: scrubbing }),
    setThumbnailPath: (originalPath, cachePath) => {
      set((state) => ({
        fileMetadataList: state.fileMetadataList.map((file) =>
          file.path === originalPath
            ? { ...file, thumbnailPath: convertFileSrc(cachePath) }
            : file,
        ),
      }));
    },

    setCurrentFolderPath: (path) => set({ currentFolderPath: path }),
    setFolderList: (folders) => set({ folderList: folders }),
  };
});
