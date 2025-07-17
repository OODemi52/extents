import { create } from "zustand";

import { ImageMetadata } from "../types/image";

interface ImageStore {
  // Image-related state
  fileMetadataList: ImageMetadata[];
  selectedIndex: number | null;
  currentImageData: string | null;
  isLoading: boolean;

  // Folder navigation state
  currentFolderPath: string | null;
  folderList: string[];

  // Setters
  setFileMetadataList: (list: ImageMetadata[]) => void;
  setSelectedIndex: (index: number | null) => void;
  setCurrentImageData: (data: string | null) => void;
  setIsLoading: (loading: boolean) => void;

  setCurrentFolderPath: (path: string | null) => void;
  setFolderList: (folders: string[]) => void;
}

export const useImageStore = create<ImageStore>((set) => ({
  // Image state
  fileMetadataList: [],
  selectedIndex: null,
  currentImageData: null,
  isLoading: false,

  // Folder state
  currentFolderPath: null,
  folderList: [],

  // Setters
  setFileMetadataList: (list) => set({ fileMetadataList: list }),
  setSelectedIndex: (index) => set({ selectedIndex: index }),
  setCurrentImageData: (data) => set({ currentImageData: data }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  setCurrentFolderPath: (path) => set({ currentFolderPath: path }),
  setFolderList: (folders) => set({ folderList: folders }),
}));
