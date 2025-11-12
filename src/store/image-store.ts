import { create } from "zustand";
import { convertFileSrc } from "@tauri-apps/api/core";

import { ImageMetadata } from "../types/image";

import { useImageTransformStore } from "./transform-store";

interface ImageStore {
  fileMetadataList: ImageMetadata[];
  selectedIndex: number | null;
  currentImageData: string | null;
  isLoading: boolean;

  currentFolderPath: string | null;
  folderList: string[];

  setFileMetadataList: (list: ImageMetadata[]) => void;
  appendFileMetadataList: (list: ImageMetadata[]) => void;
  setSelectedIndex: (index: number | null) => void;
  selectRelative: (delta: number) => void;
  selectFirst: () => void;
  selectLast: () => void;
  setCurrentImageData: (data: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setThumbnailPath: (originalPath: string, cachePath: string) => void;

  setCurrentFolderPath: (path: string | null) => void;
  setFolderList: (folders: string[]) => void;
}

export const useImageStore = create<ImageStore>((set) => ({
  fileMetadataList: [],
  selectedIndex: null,
  currentImageData: null,
  isLoading: false,

  currentFolderPath: null,
  folderList: [],

  setFileMetadataList: (list) => set({ fileMetadataList: list }),
  appendFileMetadataList: (list) =>
    set((state) => ({
      fileMetadataList: [...state.fileMetadataList, ...list],
    })),
  setSelectedIndex: (index: number | null) => {
    set({ selectedIndex: index });

    if (index !== null) {
      useImageTransformStore.getState().resetTransform();
    }
  },
  selectRelative: (delta: number) =>
    set((state) => {
      const total = state.fileMetadataList.length;

      if (total === 0 || delta === 0) {
        return {};
      }

      const current =
        state.selectedIndex !== null
          ? state.selectedIndex
          : delta > 0
            ? -1
            : total;

      const next = Math.min(Math.max(current + delta, 0), total - 1);

      if (next === state.selectedIndex) {
        return {};
      }

      useImageTransformStore.getState().resetTransform();

      return { selectedIndex: next };
    }),
  selectFirst: () =>
    set((state) => {
      if (!state.fileMetadataList.length || state.selectedIndex === 0) {
        return {};
      }

      useImageTransformStore.getState().resetTransform();

      return { selectedIndex: 0 };
    }),
  selectLast: () =>
    set((state) => {
      const total = state.fileMetadataList.length;
      const lastIndex = total - 1;

      if (!total || state.selectedIndex === lastIndex) {
        return {};
      }

      useImageTransformStore.getState().resetTransform();

      return { selectedIndex: lastIndex };
    }),
  setCurrentImageData: (data) => set({ currentImageData: data }),
  setIsLoading: (loading) => set({ isLoading: loading }),
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
}));
