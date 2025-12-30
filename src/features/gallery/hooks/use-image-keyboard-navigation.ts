import { useEffect } from "react";

import { useImageLoader } from "@/hooks/use-image-loader";
import { useImageStore } from "@/store/image-store";

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
  const { fileMetadataList, selectedIndex } = useImageStore();
  const hasImages = paths.length > 0;

  useEffect(() => {
    if (!enabled || !hasImages) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || shouldIgnoreTarget(event.target)) {
        return;
      }

      const currentPath =
        selectedIndex !== null
          ? (fileMetadataList[selectedIndex]?.path ?? null)
          : null;

      const currentIndex = currentPath ? paths.indexOf(currentPath) : -1;

      const selectByIndex = (index: number) => {
        const path = paths[index];

        if (!path) {
          return;
        }

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
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    enabled,
    hasImages,
    paths,
    fileMetadataList,
    selectedIndex,
    handleSelectImageByPath,
  ]);
}
