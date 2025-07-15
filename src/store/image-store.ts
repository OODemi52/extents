import { create } from "zustand";

import { ImageMetadata } from "../types/image";

interface ImageStore {
  fileMetadataList: ImageMetadata[];
  selectedIndex: number | null;
  currentImageData: string | null;
  isLoading: boolean;
  setFileMetadataList: (list: ImageMetadata[]) => void;
  setSelectedIndex: (index: number | null) => void;
  setCurrentImageData: (data: string | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useImageStore = create<ImageStore>((set) => ({
  fileMetadataList: [],
  selectedIndex: null,
  currentImageData: null,
  isLoading: false,

  setFileMetadataList: (list) => set({ fileMetadataList: list }),
  setSelectedIndex: (index) => set({ selectedIndex: index }),
  setCurrentImageData: (data) => set({ currentImageData: data }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
