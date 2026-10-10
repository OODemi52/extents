import { IMAGE_FIT_SCALE } from "@/types/image-transform";

export const FIT_SCALE = IMAGE_FIT_SCALE;
export const MIN_SCALE = 0.01;
export const MAX_SCALE = 30;
export const CLICK_ZOOM_SCALE = 3;

const FIT_SCALE_EPSILON = 0.005;

export const isFitScale = (scale: number) =>
  Math.abs(scale - FIT_SCALE) <= FIT_SCALE_EPSILON;
