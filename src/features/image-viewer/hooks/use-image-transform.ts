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

  useEffect(() => {
    if (!imagePath) {
      lastFitKeyRef.current = null;
      reset();
    }
  }, [imagePath, reset]);

  const fitToViewport = useCallback(() => {
    if (!preview || !viewportRef.current) return;

    const boundingRect = viewportRef.current.getBoundingClientRect();

    if (boundingRect.width <= 0 || boundingRect.height <= 0) return;

    const fitKey = [
      preview.path,
      preview.width,
      preview.height,
      Math.round(boundingRect.width),
      Math.round(boundingRect.height),
    ].join(":");

    if (lastFitKeyRef.current === fitKey) return;

    lastFitKeyRef.current = fitKey;

    const imageAspect = preview.width / preview.height;

    const viewportAspect = boundingRect.width / boundingRect.height;

    const fitScale =
      imageAspect > viewportAspect
        ? (boundingRect.width / preview.width) * FIT_PADDING
        : (boundingRect.height / preview.height) * FIT_PADDING;

    reset({ scale: fitScale, offsetX: 0, offsetY: 0 });
  }, [preview, viewportRef, reset]);

  useEffect(() => {
    fitToViewport();
  }, [fitToViewport]);

  useEffect(() => {
    let frame: number;

    const handleResize = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        fitToViewport();
      });
    };

    handleResize(); // initial fit
    window.addEventListener("resize", handleResize);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, [fitToViewport]);

  return {
    scale,
    offsetX,
    offsetY,
    setScale,
    setOffset,
    resetTransform: reset,
  };
}
