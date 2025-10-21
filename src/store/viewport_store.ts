import { create } from "zustand";

interface ViewportStore {
  width: number;
  height: number;
  setViewportSize: (width: number, height: number) => void;
}

export const useViewportStore = create<ViewportStore>((set) => ({
  width: 0,
  height: 0,
  setViewportSize: (width: number, height: number) => set({ width, height }),
}));
