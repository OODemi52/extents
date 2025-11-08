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
