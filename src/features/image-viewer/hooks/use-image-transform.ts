import type { PreviewInfo } from "@/services/api/image";

import { useEffect, useRef, useCallback } from "react";

import { useImageTransformStore } from "../store/transform-store";

const FIT_PADDING = 0.9;

export function useImageTransform(
  preview: PreviewInfo | undefined,
  viewportRef: React.RefObject<HTMLDivElement>,
  imagePath: string | null,
) {
  const { scale, offsetX, offsetY, setScale, setOffset, reset } =
    useImageTransformStore();
  const lastFitKeyRef = useRef<string | null>(null);

  // Reset transform when image changes
  useEffect(() => {
    if (!imagePath) {
      lastFitKeyRef.current = null;
      reset();
    }
  }, [imagePath, reset]);

  // Fit image to viewport when preview loads or viewport resizes
  const fitToViewport = useCallback(() => {
    if (!preview || !viewportRef.current) return;

    const rect = viewportRef.current.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) return;

    // Create unique key for this fit operation
    const fitKey = [
      preview.path,
      preview.width,
      preview.height,
      Math.round(rect.width),
      Math.round(rect.height),
    ].join(":");

    // Skip if we've already fit this exact configuration
    if (lastFitKeyRef.current === fitKey) return;
    lastFitKeyRef.current = fitKey;

    // Calculate scale to fit
    const imageAspect = preview.width / preview.height;
    const viewportAspect = rect.width / rect.height;

    const fitScale =
      imageAspect > viewportAspect
        ? (rect.width / preview.width) * FIT_PADDING
        : (rect.height / preview.height) * FIT_PADDING;

    reset({ scale: fitScale, offsetX: 0, offsetY: 0 });
  }, [preview, viewportRef, reset]);

  // Fit on preview load/change
  useEffect(() => {
    fitToViewport();
  }, [fitToViewport]);

  // Fit on viewport resize
  useEffect(() => {
    if (!viewportRef.current) return;

    const resizeObserver = new ResizeObserver(fitToViewport);

    resizeObserver.observe(viewportRef.current);

    return () => resizeObserver.disconnect();
  }, [viewportRef, fitToViewport]);

  return {
    scale,
    offsetX,
    offsetY,
    setScale,
    setOffset,
    resetTransform: reset,
  };
}
