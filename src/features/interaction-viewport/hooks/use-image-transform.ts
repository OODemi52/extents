import { useEffect, useRef } from "react";

import { useImageTransformStore } from "@/store/transform-store";
import { FIT_IMAGE_TRANSFORM } from "@/types/image-transform";

export function useImageTransform(imagePath: string | null, active = true) {
  const scale = useImageTransformStore((state) =>
    active ? state.scale : FIT_IMAGE_TRANSFORM.scale,
  );
  const offsetX = useImageTransformStore((state) =>
    active ? state.offsetX : FIT_IMAGE_TRANSFORM.offsetX,
  );
  const offsetY = useImageTransformStore((state) =>
    active ? state.offsetY : FIT_IMAGE_TRANSFORM.offsetY,
  );
  const mode = useImageTransformStore((state) => (active ? state.mode : "fit"));
  const setMode = useImageTransformStore((state) => state.setMode);
  const setTransform = useImageTransformStore((state) => state.setTransform);
  const resetTransform = useImageTransformStore(
    (state) => state.resetTransform,
  );

  const lastImagePathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return;

    if (!imagePath) {
      lastImagePathRef.current = null;
      resetTransform();

      return;
    }

    if (lastImagePathRef.current === imagePath) {
      return;
    }

    lastImagePathRef.current = imagePath;

    resetTransform();
  }, [active, imagePath, resetTransform]);

  return {
    scale,
    offsetX,
    offsetY,
    mode,
    setMode,
    setTransform,
    resetTransform,
  };
}
