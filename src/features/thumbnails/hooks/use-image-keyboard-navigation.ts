import { useEffect } from "react";

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

export function useImageKeyboardNavigation(enabled = true) {
  const selectRelative = useImageStore((state) => state.selectRelative);
  const selectFirst = useImageStore((state) => state.selectFirst);
  const selectLast = useImageStore((state) => state.selectLast);
  const hasImages = useImageStore((state) => state.fileMetadataList.length > 0);

  useEffect(() => {
    if (!enabled || !hasImages) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || shouldIgnoreTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (event.metaKey || event.ctrlKey) {
          selectFirst();
        } else {
          selectRelative(-1);
        }
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (event.metaKey || event.ctrlKey) {
          selectLast();
        } else {
          selectRelative(1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, hasImages, selectRelative, selectFirst, selectLast]);
}
