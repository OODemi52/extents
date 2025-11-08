import { create } from "zustand";

type TransformUpdate = {
  scale?: number;
  offsetX?: number;
  offsetY?: number;
};

interface TransformState {
  scale: number;
  offsetX: number;
  offsetY: number;
  setScale: (scale: number) => void;
  setOffset: (offset: { x: number; y: number }) => void;
  resetTransform: (override?: TransformUpdate) => void;
}

export const useImageTransformStore = create<TransformState>((set) => ({
  scale: 1,
  offsetX: 0,
  offsetY: 0,

  setScale: (scale) =>
    set((state) => {
      if (state.scale === scale) {
        return state;
      }

      return { ...state, scale };
    }),

  setOffset: (offset) =>
    set((state) => {
      if (state.offsetX === offset.x && state.offsetY === offset.y) {
        return state;
      }

      return {
        ...state,
        offsetX: offset.x,
        offsetY: offset.y,
      };
    }),

  resetTransform: (override) =>
    set((state) => {
      const nextScale = override?.scale ?? 1;
      const nextOffsetX = override?.offsetX ?? 0;
      const nextOffsetY = override?.offsetY ?? 0;

      if (
        state.scale === nextScale &&
        state.offsetX === nextOffsetX &&
        state.offsetY === nextOffsetY
      ) {
        return state;
      }

      return {
        ...state,
        scale: nextScale,
        offsetX: nextOffsetX,
        offsetY: nextOffsetY,
      };
    }),
}));
