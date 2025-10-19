import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

type ImageCanvasProps = {
  path: string;
};

/**
 * An invisible component that controls the WGPU backend.
 * It tells the backend which image to load and render.
 *
 * This component does not render anything to the DOM.
 * It just controls the background WGPU renderer.
 */
export function ImageCanvas({ path }: ImageCanvasProps) {
  useEffect(() => {
    if (!path) return;

    const loadImage = async () => {
      try {
        await invoke("load_image", { path });
        console.log("Load image command sent for:", path);
      } catch (e) {
        console.error("Failed to load image:", e);
      }
    };

    loadImage();
  }, [path]);
  return null;
}
