import { create } from "zustand";

import {
  FIT_IMAGE_TRANSFORM,
  type ImageTransform,
  type ImageTransformMode,
} from "@/types/image-transform";

export type {
  ImageTransform,
  ImageTransformMode,
} from "@/types/image-transform";

type TransformUpdate = {
  scale?: number;
  offsetX?: number;
  offsetY?: number;
};

interface TransformState extends ImageTransform {
  mode: ImageTransformMode;
  setMode: (mode: ImageTransformMode) => void;
  setTransform: (transform: ImageTransform, mode?: ImageTransformMode) => void;
  resetTransform: (override?: TransformUpdate) => void;
}

export const useImageTransformStore = create<TransformState>((set) => ({
  ...FIT_IMAGE_TRANSFORM,
  mode: "fit",

  setMode: (mode) => set((state) => (state.mode === mode ? state : { mode })),

  setTransform: (transform, mode = "manual") =>
    set((state) => {
      if (
        state.mode === mode &&
        state.scale === transform.scale &&
        state.offsetX === transform.offsetX &&
        state.offsetY === transform.offsetY
      ) {
        return state;
      }

      return { ...transform, mode };
    }),

  resetTransform: (override) =>
    set((state) => {
      const nextScale = override?.scale ?? FIT_IMAGE_TRANSFORM.scale;
      const nextOffsetX = override?.offsetX ?? FIT_IMAGE_TRANSFORM.offsetX;
      const nextOffsetY = override?.offsetY ?? FIT_IMAGE_TRANSFORM.offsetY;

      if (
        state.mode === "fit" &&
        state.scale === nextScale &&
        state.offsetX === nextOffsetX &&
        state.offsetY === nextOffsetY
      ) {
        return state;
      }

      return {
        ...state,
        mode: "fit",
        scale: nextScale,
        offsetX: nextOffsetX,
        offsetY: nextOffsetY,
      };
    }),
}));
