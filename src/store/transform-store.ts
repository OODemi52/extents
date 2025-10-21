import { create } from "zustand";

interface TransformState {
  scale: number;
  offsetX: number;
  offsetY: number;
  setScale: (scale: number) => void;
  setOffset: (offset: { x: number; y: number }) => void;
  resetTransform: (params?: {
    scale?: number;
    offsetX?: number;
    offsetY?: number;
  }) => void;
}

export const useTransformStore = create<TransformState>((set) => ({
  scale: 1.0,
  offsetX: 0.0,
  offsetY: 0.0,

  setScale: (scale) => set({ scale }),

  setOffset: (offset) =>
    set({
      offsetX: offset.x,
      offsetY: offset.y,
    }),

  resetTransform: (params) => {
    set({
      scale: params?.scale ?? 1.0,
      offsetX: params?.offsetX ?? 0.0,
      offsetY: params?.offsetY ?? 0.0,
    });
  },
}));
