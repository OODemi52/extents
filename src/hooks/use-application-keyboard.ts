import { useEffect } from "react";

import { getFilteredPaths } from "@/features/filter/hooks/use-filtered-files";
import { useScrubbing } from "@/features/gallery/hooks/use-scrubbing";
import { useImageStore } from "@/store/image-store";
import { useLayoutStore } from "@/store/layout-store";

const TEXT_EDITING_SELECTOR = [
  "input:not([type])",
  'input[type="text"]',
  'input[type="search"]',
  'input[type="number"]',
  'input[type="email"]',
  'input[type="password"]',
  'input[type="tel"]',
  'input[type="url"]',
  "textarea",
  "select",
  '[contenteditable="true"]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="spinbutton"]',
].join(",");

const OVERLAY_SELECTOR = [
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
  '[role="listbox"]',
].join(",");

const isTextEditing = (target: Element | null) =>
  Boolean(target?.closest(TEXT_EDITING_SELECTOR));

const isInManagedOverlay = (target: Element | null) => {
  const overlay = target?.closest(OVERLAY_SELECTOR);

  return Boolean(overlay && !overlay.closest('[data-photo-navigation="true"]'));
};

const getAdjacentPhotoIndex = (delta: -1 | 1) => {
  const filteredPaths = getFilteredPaths();

  if (filteredPaths.length === 0) return null;

  const { files, selectedIndex } = useImageStore.getState();
  const currentPath =
    selectedIndex !== null ? (files[selectedIndex]?.path ?? null) : null;
  const currentFilteredIndex = currentPath
    ? filteredPaths.indexOf(currentPath)
    : -1;
  const baseIndex =
    currentFilteredIndex >= 0
      ? currentFilteredIndex
      : delta > 0
        ? -1
        : filteredPaths.length;
  const nextFilteredIndex = Math.min(
    Math.max(baseIndex + delta, 0),
    filteredPaths.length - 1,
  );
  const nextPath = filteredPaths[nextFilteredIndex];

  if (!nextPath || nextPath === currentPath) return null;

  const nextFileIndex = files.findIndex((file) => file.path === nextPath);

  return nextFileIndex >= 0 ? nextFileIndex : null;
};

export function useApplicationKeyboard() {
  const { startScrubbing } = useScrubbing();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;

      const target = event.target instanceof Element ? event.target : null;

      if (event.key === "Tab") {
        if (
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          isTextEditing(target) ||
          isInManagedOverlay(target)
        ) {
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        useLayoutStore.getState().toggleSidePanels();

        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        return;
      }

      if (
        (event.key !== "ArrowLeft" && event.key !== "ArrowRight") ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isTextEditing(target) ||
        isInManagedOverlay(target)
      ) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const nextIndex = getAdjacentPhotoIndex(
        event.key === "ArrowLeft" ? -1 : 1,
      );

      if (nextIndex === null) return;

      startScrubbing();
      useImageStore.getState().selectSingleByIndex(nextIndex);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [startScrubbing]);
}
