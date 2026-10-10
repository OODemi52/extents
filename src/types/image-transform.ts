export const IMAGE_FIT_SCALE = 0.97;

export type ImageTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type ImageTransformMode = "fit" | "manual";

export const FIT_IMAGE_TRANSFORM: ImageTransform = {
  scale: IMAGE_FIT_SCALE,
  offsetX: 0,
  offsetY: 0,
};
