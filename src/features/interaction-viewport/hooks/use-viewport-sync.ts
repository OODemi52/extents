import type { PreviewInfo } from "@/services/api/image";

import { useEffect, useRef, useCallback } from "react";

import { api } from "@/services/api";

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

  const updateViewport = useCallback(() => {
    if (!viewportRef.current) {
      return;
    }

    if (viewportTimeoutRef.current !== null) {
      clearTimeout(viewportTimeoutRef.current);
    }

    viewportTimeoutRef.current = window.setTimeout(() => {
      if (!viewportRef.current) return;

      const clientViewportDimensions =
        viewportRef.current.getBoundingClientRect();

      const devicePixelRatio = window.devicePixelRatio;

      api.renderer
        .syncViewport({
          x: clientViewportDimensions.x * devicePixelRatio,
          y: clientViewportDimensions.y * devicePixelRatio,
          width: clientViewportDimensions.width * devicePixelRatio,
          height: clientViewportDimensions.height * devicePixelRatio,
        })
        .catch((error) =>
          console.error("[useViewportSync] update_viewport failed:", error),
        );
    }, VIEWPORT_DEBOUNCE_MS);
  }, [viewportRef]);

  useEffect(() => {
    if (!preview || !viewportRef.current) return;

    if (lastImagePathRef.current === preview.path) return;

    lastImagePathRef.current = preview.path;

    const clientViewportDimensions =
      viewportRef.current.getBoundingClientRect();

    const devicePixelRatio = window.devicePixelRatio;

    let rafId: number | null = null;

    api.renderer
      .loadImage({
        path: preview.path,
        viewportX: clientViewportDimensions.x * devicePixelRatio,
        viewportY: clientViewportDimensions.y * devicePixelRatio,
        viewportWidth: clientViewportDimensions.width * devicePixelRatio,
        viewportHeight: clientViewportDimensions.height * devicePixelRatio,
      })
      .then(() => {
        rafId = window.requestAnimationFrame(() => {
          updateViewport();
        });
      })
      .catch((error) =>
        console.error("[useViewportSync] load_image failed:", error),
      );

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [preview?.path, viewportRef, updateViewport]);

  // Was tryign to use this previously to manage scaling the image when adjusting the window
  // but honestly it seems kinda fine without it. Obviously needs some tuning, but i think its
  // fine for now.

  // Realized cause of the thrashing. Initial load currently has the image aspect squished.
  // When resizing the window, gpu corrects the aspect, but this function fires on observer changed
  // of th viewport, then tries to update and resquishes the image
  // To clarify the client does not direct affect the image, it is just passing the wrong dimensions

  // Update viewport on resize/scroll. Don't trigger render state changes for viewport updates
  // useEffect(() => {
  //   if (!viewportRef.current) return;

  //   const resizeObserver = new ResizeObserver(() => {
  //     updateViewport();
  //   });

  //   resizeObserver.observe(viewportRef.current);

  //   const handleScroll = () => {
  //     updateViewport();
  //   };

  //   window.addEventListener("scroll", handleScroll, true);

  //   // Initial update
  //   updateViewport();

  //   return () => {
  //     resizeObserver.disconnect();

  //     window.removeEventListener("scroll", handleScroll, true);

  //     if (viewportTimeoutRef.current !== null) {
  //       clearTimeout(viewportTimeoutRef.current);
  //     }
  //   };
  // }, [updateViewport]);

  useEffect(() => {
    if (!viewportRef.current) return;

    const handleWindowResize = () => {
      updateViewport();
    };

    window.addEventListener("resize", handleWindowResize);

    updateViewport();

    return () => {
      window.removeEventListener("resize", handleWindowResize);

      if (viewportTimeoutRef.current !== null) {
        clearTimeout(viewportTimeoutRef.current);
      }
    };
  }, [updateViewport, viewportRef]);

  useEffect(() => {
    if (!preview) return;

    const lastTransform = lastTransformRef.current;

    if (
      lastTransform.scale === scale &&
      lastTransform.offsetX === offsetX &&
      lastTransform.offsetY === offsetY
    ) {
      return;
    }

    if (transformTimeoutRef.current !== null) {
      cancelAnimationFrame(transformTimeoutRef.current);
    }

    transformTimeoutRef.current = requestAnimationFrame(() => {
      lastTransformRef.current = { scale, offsetX, offsetY };

      api.renderer
        .updateTransform({ scale, offsetX, offsetY })
        .catch((error) =>
          console.error("[useViewportSync] update_transform failed:", error),
        );
    });

    return () => {
      if (transformTimeoutRef.current !== null) {
        cancelAnimationFrame(transformTimeoutRef.current);
      }
    };
  }, [scale, offsetX, offsetY, preview]);
}
