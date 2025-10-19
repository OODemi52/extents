import { useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

import { useImageStore } from "../store/image-store";
import { useTransformStore } from "../store/transform-store";

import { ImageCanvas } from "./image-canvas";

export function ImageViewer() {
  const { fileMetadataList, selectedIndex, isLoading } = useImageStore();
  const { scale, offsetX, offsetY, setScale, setOffset } = useTransformStore();
  const selected =
    selectedIndex !== null ? fileMetadataList[selectedIndex] : null;
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!viewer) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { x, y, width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio;

        invoke("update_viewport", {
          x: x * dpr,
          y: y * dpr,
          width: width * dpr,
          height: height * dpr,
        }).catch(console.error);
      }
    });

    observer.observe(viewer);

    return () => observer.disconnect();
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();

      const viewer = viewerRef.current;
      if (!viewer) return;

      const rect = viewer.getBoundingClientRect();
      const cursorX = ((event.clientX - rect.left) / rect.width) * 2 - 1; // normalize to -1..1
      const cursorY = -(((event.clientY - rect.top) / rect.height) * 2 - 1); // flip Y

      if (event.ctrlKey) {
        // Pinch-to-zoom
        const prevScale = scale;
        const newScale = Math.min(
          Math.max(0.1, prevScale - event.deltaY * 0.01),
          10,
        );

        // Adjust offset so zoom centers on cursor
        const zoomFactor = newScale / prevScale;
        const newOffsetX = offsetX + (1 - zoomFactor) * (cursorX - offsetX);
        const newOffsetY = offsetY + (1 - zoomFactor) * (cursorY - offsetY);

        setScale(newScale);
        setOffset({ x: newOffsetX, y: newOffsetY });
      } else {
        // Two-finger pan
        const newOffsetX =
          offsetX - (event.deltaX * 2) / (viewer.clientWidth || 1);
        const newOffsetY =
          offsetY + (event.deltaY * 2) / (viewer.clientHeight || 1);

        setOffset({ x: newOffsetX, y: newOffsetY });
      }
    },
    [scale, offsetX, offsetY, setScale, setOffset],
  );

  useEffect(() => {
    const viewer = viewerRef.current;

    if (!viewer) return;

    viewer.addEventListener("wheel", handleWheel, { passive: false });

    return () => viewer.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // This effect sends the transform state to the backend
  useEffect(() => {
    invoke("update_transform", { scale, offsetX, offsetY }).catch(
      console.error,
    );
  }, [scale, offsetX, offsetY]);

  return (
    // Add the ref here
    <div
      ref={viewerRef}
      className="flex-grow flex items-center justify-center p-4 relative bg-transparent touch-none"
    >
      {selected?.path && <ImageCanvas path={selected.path} />}

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
