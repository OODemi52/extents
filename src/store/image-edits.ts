import { create } from "zustand";

interface ImageEdits {
  brightness: number;
  contrast: number;
  setBrightness: (value: number) => void;
  setContrast: (value: number) => void;
}

export const useImageEdits = create<ImageEdits>((set) => ({
  brightness: 0,
  contrast: 1,
  setBrightness: (value: number) => set({ brightness: value }),
  setContrast: (value: number) => set({ contrast: value }),
}));
