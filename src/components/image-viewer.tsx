import { useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

import { useImageStore } from "../store/image-store";
import { useTransformStore } from "../store/transform-store";

import { ImageCanvas } from "./image-canvas";

export function ImageViewer() {
  const { fileMetadataList, selectedIndex, isLoading } = useImageStore();
  const { scale, offsetX, offsetY, setScale, setOffset, resetTransform } =
    useTransformStore();

  const selected =
    selectedIndex !== null ? fileMetadataList[selectedIndex] : null;
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected?.path || !viewportRef.current) return;

    const divRect = viewportRef.current.getBoundingClientRect();
    const { width: imageWidth, height: imageHeight } = selected;

    if (
      !imageWidth ||
      !imageHeight ||
      divRect.width <= 0 ||
      divRect.height <= 0
    ) {
      return;
    }

    const padding = 0.95;

    const imageAspect = imageWidth / imageHeight;
    const divAspect = divRect.width / divRect.height;

    // 3. Calculate the correct uniform scale to fit the image inside the div
    let scale;

    if (imageAspect > divAspect) {
      // Image is wider than the div, so fit to width
      scale = (divRect.width / imageWidth) * padding;
    } else {
      // Image is taller than the div, so fit to height
      scale = (divRect.height / imageHeight) * padding;
    }

    // 4. Reset the transform with the new calculated scale and zero offsets
    resetTransform({ scale });
  }, [selected?.path, selected?.width, selected?.height, resetTransform]);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();

      // Trigger active render state
      invoke("set_render_state", { stateStr: "active" }).catch(console.error);
      setTimeout(() => {
        invoke("set_render_state", { stateStr: "idle" }).catch(console.error);
      }, 100);

      const viewer = viewportRef.current;

      if (!viewer) return;

      const rect = viewer.getBoundingClientRect();
      const cursorX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const cursorY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

      if (event.ctrlKey || event.metaKey) {
        // Zoom - use multiplicative factor for smooth feel
        const prevScale = scale;
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1; // 10% per scroll tick

        const newScale = Math.min(
          Math.max(0.1, prevScale * zoomFactor),
          10, // Max 10x zoom
        );

        // Zoom toward cursor position
        const scaleFactor = newScale / prevScale;
        const newOffsetX = offsetX + (1 - scaleFactor) * (cursorX - offsetX);
        const newOffsetY = offsetY + (1 - scaleFactor) * (cursorY - offsetY);

        setScale(newScale);
        setOffset({ x: newOffsetX, y: newOffsetY });
      } else {
        // Pan
        const panSpeed = 2;
        const newOffsetX =
          offsetX - (event.deltaX * panSpeed) / (viewer.clientWidth || 1);
        const newOffsetY =
          offsetY + (event.deltaY * panSpeed) / (viewer.clientHeight || 1);

        setOffset({ x: newOffsetX, y: newOffsetY });
      }
    },
    [scale, offsetX, offsetY, setScale, setOffset],
  );

  useEffect(() => {
    const viewer = viewportRef.current;

    if (!viewer) return;

    viewer.addEventListener("wheel", handleWheel, { passive: false });

    return () => viewer.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Send transform to backend
  useEffect(() => {
    invoke("update_transform", { scale, offsetX, offsetY }).catch(
      console.error,
    );
  }, [scale, offsetX, offsetY]);

  return (
    <div
      ref={viewportRef}
      className="flex-grow flex items-center justify-center p-4 relative bg-transparent touch-none"
    >
      {selected?.path && (
        <ImageCanvas path={selected.path} viewportRef={viewportRef} />
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <p className="bg-black bg-opacity-50 text-white p-4 rounded-lg">
            Loading...
          </p>
        </div>
      )}

      {!selected?.path && !isLoading && (
        <div className="text-gray-500">
          {fileMetadataList.length
            ? "Select an image to view"
            : "No folder selected. Pick a folder to start."}
        </div>
      )}
    </div>
  );
}
