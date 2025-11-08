import { useEffect, useRef } from "react";

import { useImageTransformStore } from "@/store/transform-store";

const FIT_SCALE = 0.97;

export function useImageTransform(imagePath: string | null) {
  const { scale, offsetX, offsetY, setScale, setOffset, resetTransform } =
    useImageTransformStore();

  const lastImagePathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!imagePath) {
      lastImagePathRef.current = null;
      resetTransform();

      return;
    }

    if (lastImagePathRef.current === imagePath) {
      return;
    }

    lastImagePathRef.current = imagePath;

    resetTransform({ scale: FIT_SCALE, offsetX: 0, offsetY: 0 });
  }, [imagePath, resetTransform]);

  return {
    scale,
    offsetX,
    offsetY,
    setScale,
    setOffset,
    resetTransform,
  };
}
