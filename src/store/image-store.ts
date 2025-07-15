import { create } from "zustand";

import { ImageMetadata } from "@/types/image";

interface ImageState {
  fileMetadataList: ImageMetadata[];
  selectedIndex: number | null;
  currentImageData: string | null;
  isLoading: boolean;

  setFiles: (files: ImageMetadata[]) => void;
  selectImage: (index: number) => void;
  setImageData: (data: string) => void;
  setLoading: (value: boolean) => void;
}

export const useImageStore = create<ImageState>((set) => ({
  fileMetadataList: [],
  selectedIndex: null,
  currentImageData: null,
  isLoading: false,

  setFiles: (files) => set({ fileMetadataList: files }),
  selectImage: (index) => set({ selectedIndex: index }),
  setImageData: (data) => set({ currentImageData: data }),
  setLoading: (value) => set({ isLoading: value }),
}));
