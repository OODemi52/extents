import type { PreviewInfo } from "@/services/api/image";

import { useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

const VIEWPORT_DEBOUNCE_MS = 100;

export function useViewportSync(
  viewportRef: React.RefObject<HTMLDivElement>,
  preview: PreviewInfo | undefined,
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  const lastImagePathRef = useRef<string | null>(null);
  const viewportTimeoutRef = useRef<number | null>(null);
  const transformTimeoutRef = useRef<number | null>(null);
  const lastTransformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });

  // Send viewport dimensions to backend (debounced)
  const updateViewport = useCallback(() => {
    if (!viewportRef.current) {
      console.log("[useViewportSync] Skip viewport update: no ref");

      return;
    }

    // Set render state to active during viewport changes
    invoke("set_render_state", { stateStr: "active" }).catch(console.error);

    if (viewportTimeoutRef.current !== null) {
      clearTimeout(viewportTimeoutRef.current);
    }

    viewportTimeoutRef.current = window.setTimeout(() => {
      if (!viewportRef.current) return;

      const boundingRect = viewportRef.current.getBoundingClientRect();
      const devicePixelRatio = window.devicePixelRatio;

      invoke("update_viewport", {
        x: boundingRect.x * devicePixelRatio,
        y: boundingRect.y * devicePixelRatio,
        width: boundingRect.width * devicePixelRatio,
        height: boundingRect.height * devicePixelRatio,
      }).catch((err) =>
        console.error("[useViewportSync] update_viewport failed:", err),
      );

      // Set back to idle after viewport update completes
      setTimeout(() => {
        invoke("set_render_state", { stateStr: "idle" }).catch(console.error);
      }, 150);
    }, VIEWPORT_DEBOUNCE_MS);
  }, [viewportRef]);

  // Load new image when preview changes
  useEffect(() => {
    if (!preview || !viewportRef.current) return;

    if (lastImagePathRef.current === preview.path) return;

    lastImagePathRef.current = preview.path;

    const boundingRect = viewportRef.current.getBoundingClientRect();

    const devicePixelRatio = window.devicePixelRatio;

    invoke("load_image", {
      path: preview.path,
      viewportX: boundingRect.x * devicePixelRatio,
      viewportY: boundingRect.y * devicePixelRatio,
      viewportWidth: boundingRect.width * devicePixelRatio,
      viewportHeight: boundingRect.height * devicePixelRatio,
    }).catch((err) =>
      console.error("[useViewportSync] load_image failed:", err),
    );
  }, [preview?.path, viewportRef]);

  // Update viewport on resize/scroll
  // Don't trigger render state changes for viewport updates
  useEffect(() => {
    if (!viewportRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      updateViewport();
    });

    resizeObserver.observe(viewportRef.current);

    const handleScroll = () => {
      updateViewport();
    };

    window.addEventListener("scroll", handleScroll, true);

    // Initial update
    updateViewport();

    return () => {
      resizeObserver.disconnect();

      window.removeEventListener("scroll", handleScroll, true);

      if (viewportTimeoutRef.current !== null) {
        clearTimeout(viewportTimeoutRef.current);
      }
    };
  }, [updateViewport]);

  // Update transform using requestAnimationFrame for smooth performance
  // Only send transform updates if we have a loaded preview AND values actually changed
  useEffect(() => {
    if (!preview) return;

    // Skip if values haven't actually changed
    const last = lastTransformRef.current;

    if (
      last.scale === scale &&
      last.offsetX === offsetX &&
      last.offsetY === offsetY
    ) {
      return;
    }

    // Cancel any pending transform update
    if (transformTimeoutRef.current !== null) {
      cancelAnimationFrame(transformTimeoutRef.current);
    }

    // Use requestAnimationFrame to sync with display refresh
    transformTimeoutRef.current = requestAnimationFrame(() => {
      lastTransformRef.current = { scale, offsetX, offsetY };

      invoke("update_transform", { scale, offsetX, offsetY }).catch((err) =>
        console.error("[useViewportSync] update_transform failed:", err),
      );
    });

    return () => {
      if (transformTimeoutRef.current !== null) {
        cancelAnimationFrame(transformTimeoutRef.current);
      }
    };
  }, [scale, offsetX, offsetY, preview]);
}
