import { useEffect, RefObject } from "react";
import { invoke } from "@tauri-apps/api/core";

type ImageCanvasProps = {
  path: string;
  viewportRef: RefObject<HTMLDivElement>;
};

export function ImageCanvas({ path, viewportRef }: ImageCanvasProps) {
  useEffect(() => {
    if (!path) return;

    const loadImage = async () => {
      if (!viewportRef.current) return;

      const rect = viewportRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio;

      try {
        // Send all four properties to the backend
        await invoke("load_image", {
          path,
          viewportX: rect.x * dpr,
          viewportY: rect.y * dpr,
          viewportWidth: rect.width * dpr,
          viewportHeight: rect.height * dpr,
        });
        console.log("Load image command sent for:", path);
      } catch (e) {
        console.error("Failed to load image:", e);
      }
    };

    loadImage();
  }, [path, viewportRef]);

  return null;
}
