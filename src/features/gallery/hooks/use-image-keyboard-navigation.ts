import { useEffect, useRef, useCallback } from "react";

import { useImageLoader } from "@/hooks/use-image-loader";
import { useImageStore } from "@/store/image-store";

const SCRUB_SETTLE_MS = 250;

function shouldIgnoreTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.getAttribute("role") === "textbox"
  );
}

export function useImageKeyboardNavigation(paths: string[], enabled = true) {
  const { handleSelectImageByPath } = useImageLoader();
  const hasImages = paths.length > 0;
  const scrubTimeoutRef = useRef<number | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.defaultPrevented || shouldIgnoreTarget(event.target)) {
        return;
      }

      const { fileMetadataList, selectedIndex, isScrubbing, setIsScrubbing } =
        useImageStore.getState();

      const clearScrubTimeout = () => {
        if (scrubTimeoutRef.current !== null) {
          clearTimeout(scrubTimeoutRef.current);
          scrubTimeoutRef.current = null;
        }
      };

      const scheduleScrubClear = () => {
        clearScrubTimeout();
        scrubTimeoutRef.current = window.setTimeout(() => {
          scrubTimeoutRef.current = null;
          setIsScrubbing(false);
        }, SCRUB_SETTLE_MS);
      };

      const markScrubbing = () => {
        if (!isScrubbing) {
          setIsScrubbing(true);
        }
        scheduleScrubClear();
      };

      const currentPath =
        selectedIndex !== null
          ? (fileMetadataList[selectedIndex]?.path ?? null)
          : null;

      const currentIndex = currentPath ? paths.indexOf(currentPath) : -1;

      const selectByIndex = (index: number) => {
        const path = paths[index];

        if (!path || path === currentPath) {
          return;
        }

        markScrubbing();
        handleSelectImageByPath(path);
      };

      const selectRelative = (delta: number) => {
        if (delta === 0 || paths.length === 0) {
          return;
        }

        const baseIndex =
          currentIndex !== -1 ? currentIndex : delta > 0 ? -1 : paths.length;
        const nextIndex = Math.min(
          Math.max(baseIndex + delta, 0),
          paths.length - 1,
        );

        if (nextIndex === baseIndex) {
          return;
        }

        selectByIndex(nextIndex);
      };

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (event.metaKey || event.ctrlKey) {
          selectByIndex(0);
        } else {
          selectRelative(-1);
        }
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (event.metaKey || event.ctrlKey) {
          selectByIndex(paths.length - 1);
        } else {
          selectRelative(1);
        }
      }
    },
    [paths, handleSelectImageByPath],
  );

  useEffect(() => {
    if (!enabled || !hasImages) {
      return;
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (scrubTimeoutRef.current !== null) {
        clearTimeout(scrubTimeoutRef.current);
      }
      useImageStore.getState().setIsScrubbing(false);
    };
  }, [enabled, hasImages, handleKeyDown]);
}
