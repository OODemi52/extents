import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TransformState {
  scale: number;
  offsetX: number;
  offsetY: number;
  setScale: (scale: number) => void;
  setOffset: (offset: { x: number; y: number }) => void;
  resetTransform: () => void;
}

export const useTransformStore = create<TransformState>()(
  persist(
    (set) => ({
      scale: 1,
      offsetX: 0,
      offsetY: 0,

      setScale: (scale) => set({ scale }),

      setOffset: (offset) =>
        set({
          offsetX: offset.x,
          offsetY: offset.y,
        }),

      resetTransform: () => set({ scale: 1, offsetX: 0, offsetY: 0 }),
    }),
    {
      name: "transform-store",
      partialize: (state) => ({
        scale: state.scale,
        offsetX: state.offsetX,
        offsetY: state.offsetY,
      }),
    },
  ),
);
