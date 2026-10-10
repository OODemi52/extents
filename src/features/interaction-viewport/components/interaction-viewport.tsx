import type {
  ImageTransform,
  ImageTransformMode,
} from "@/store/transform-store";

import { memo, useCallback, useEffect, useRef } from "react";
import {
  FolderOpenIcon,
  ImageSquareIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

import { useImagePreview } from "../hooks/use-image-preview";
import { useViewportThumbnail } from "../hooks/use-viewport-thumbnail";
import { useImageTransform } from "../hooks/use-image-transform";
import { useViewportSync } from "../hooks/use-viewport-sync";
import { useInteractionHandlers } from "../hooks/use-interaction-handlers";
import {
  CLICK_ZOOM_SCALE,
  FIT_SCALE,
  MAX_SCALE,
  MIN_SCALE,
} from "../constants";

import { EmptyState, PhotoWorkflowGraphic } from "@/components/ui/empty-state";
import { useImageStore } from "@/store/image-store";
import { FilterMenuBar } from "@/features/filter/components/menu-bar/menu-bar";
import { useFilterStore } from "@/features/filter/stores/filter-store";
import { useFilteredImages } from "@/features/filter/hooks/use-filtered-files";
import { useImageLoader } from "@/hooks/use-image-loader";
import { useScrubbing } from "@/features/gallery/hooks/use-scrubbing";

type InteractionViewportProps = {
  onPickFolder?: () => void;
  rendererActive?: boolean;
};

export const InteractionViewport = memo(function InteractionViewport({
  onPickFolder,
  rendererActive = true,
}: InteractionViewportProps) {
  const currentFolderPath = useImageStore((state) =>
    rendererActive ? state.currentFolderPath : null,
  );
  const fileCount = useImageStore((state) =>
    rendererActive ? state.files.length : 0,
  );
  const folderScanError = useImageStore((state) =>
    rendererActive ? state.folderScanError : null,
  );
  const selected = useImageStore((state) =>
    rendererActive && state.selectedIndex !== null
      ? (state.files[state.selectedIndex] ?? null)
      : null,
  );
  const isLoading = useImageStore((state) =>
    rendererActive ? state.isLoading : false,
  );
  const isFilterOpen = useFilterStore((state) =>
    rendererActive ? state.isOpen : false,
  );
  const clearFilters = useFilterStore((state) => state.clearFilters);
  const filteredFiles = useFilteredImages(rendererActive);
  const { handleSelectImageByPath } = useImageLoader();
  const { startScrubbing } = useScrubbing();
  const viewportRef = useRef<HTMLDivElement>(null);

  const selectedFilteredIndex = selected
    ? filteredFiles.findIndex((file) => file.path === selected.path)
    : -1;
  const imagePath =
    selected && selectedFilteredIndex >= 0 ? selected.path : null;
  const isScrubbing = useImageStore((state) =>
    rendererActive ? state.isScrubbing : false,
  );

  const {
    preview,
    isLoading: isPreviewLoading,
    error: previewError,
  } = useImagePreview(imagePath, {
    enabled: rendererActive && Boolean(imagePath) && !isScrubbing,
  });

  const { thumbnailPath } = useViewportThumbnail(
    rendererActive ? imagePath : null,
  );
  const { scale, offsetX, offsetY, mode, setMode, setTransform } =
    useImageTransform(imagePath, rendererActive);

  const commitStoredTransform = useCallback(
    (transform: ImageTransform, transformMode: ImageTransformMode) => {
      setTransform(transform, transformMode);
    },
    [setTransform],
  );

  const { getTransform, updateTransform } = useViewportSync(
    viewportRef,
    preview,
    thumbnailPath,
    imagePath,
    isScrubbing,
    rendererActive,
    scale,
    offsetX,
    offsetY,
    mode,
    commitStoredTransform,
  );

  const commitViewportTransform = useCallback(
    (transform: ImageTransform, transformMode: ImageTransformMode) => {
      updateTransform(transform);
      commitStoredTransform(transform, transformMode);
    },
    [commitStoredTransform, updateTransform],
  );

  const { animateTransform } = useInteractionHandlers(viewportRef, {
    commitTransform: commitViewportTransform,
    enabled: rendererActive && Boolean(imagePath),
    getTransform,
    imagePath,
    mode,
    setMode,
    updateTransform,
  });

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.target !== viewportRef.current) {
        return;
      }

      const selectByIndex = (index: number) => {
        const path = filteredFiles[index]?.path;

        if (!path || path === imagePath) return;

        startScrubbing();
        handleSelectImageByPath(path);
      };

      if (event.key === "Home") {
        event.preventDefault();
        selectByIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        selectByIndex(filteredFiles.length - 1);
      } else if (
        (event.metaKey || event.ctrlKey) &&
        (event.key === "+" || event.key === "=")
      ) {
        event.preventDefault();
        const transform = getTransform();

        animateTransform(
          {
            ...transform,
            scale: Math.min(MAX_SCALE, transform.scale * 1.1),
          },
          "manual",
        );
      } else if ((event.metaKey || event.ctrlKey) && event.key === "-") {
        event.preventDefault();
        const transform = getTransform();

        animateTransform(
          {
            ...transform,
            scale: Math.max(MIN_SCALE, transform.scale * 0.9),
          },
          "manual",
        );
      } else if ((event.metaKey || event.ctrlKey) && event.key === "0") {
        event.preventDefault();
        animateTransform(
          {
            scale: FIT_SCALE,
            offsetX: 0,
            offsetY: 0,
          },
          "fit",
        );
      } else if (event.key === " " && imagePath) {
        event.preventDefault();

        animateTransform(
          {
            scale: mode === "fit" ? CLICK_ZOOM_SCALE : FIT_SCALE,
            offsetX: 0,
            offsetY: 0,
          },
          mode === "fit" ? "manual" : "fit",
        );
      }
    },
    [
      filteredFiles,
      handleSelectImageByPath,
      imagePath,
      animateTransform,
      getTransform,
      mode,
      startScrubbing,
    ],
  );

  useEffect(() => {
    if (!rendererActive) return;

    const viewport = viewportRef.current;

    if (!viewport) return;

    viewport.addEventListener("keydown", handleKeyDown);

    return () => viewport.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, rendererActive]);

  const isIdle = rendererActive && !isLoading && !isPreviewLoading;
  const hasOpenFolder = Boolean(currentFolderPath);
  const showNoFolder = isIdle && !hasOpenFolder && !imagePath;
  const showEmptyFolder =
    isIdle && hasOpenFolder && fileCount === 0 && !imagePath;
  const showFilteredEmpty =
    isIdle && fileCount > 0 && filteredFiles.length === 0;
  const showNoSelection =
    isIdle && filteredFiles.length > 0 && !imagePath && !previewError;
  const showScanError = isIdle && Boolean(folderScanError);
  const folderName =
    currentFolderPath?.split(/[/\\]/).filter(Boolean).pop() ?? "This folder";

  return (
    <div
      ref={viewportRef}
      aria-busy={isLoading || isPreviewLoading}
      aria-keyshortcuts="ArrowLeft ArrowRight Home End"
      aria-label="Photo preview"
      className="relative flex h-full w-full flex-grow touch-none items-center justify-center bg-transparent p-4"
      data-detail-navigation={rendererActive ? "true" : undefined}
      data-photo-navigation="true"
      role="region"
      tabIndex={rendererActive && filteredFiles.length > 0 ? 0 : -1}
    >
      <div
        aria-hidden={!isFilterOpen}
        className={`absolute left-0 top-0 z-20 w-full transition-all duration-200 ${
          isFilterOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        data-filter-ui="true"
        inert={!isFilterOpen || undefined}
      >
        {rendererActive ? <FilterMenuBar /> : null}
      </div>

      {rendererActive &&
      previewError &&
      !showFilteredEmpty &&
      !showScanError ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-[#191919]/95 p-6"
          data-filter-ui="true"
          role="alert"
        >
          <div className="flex max-w-sm items-start gap-3 rounded-[16px] border border-red-400/20 bg-red-400/[0.06] p-4 text-left">
            <WarningCircleIcon
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-red-300"
              size={20}
              weight="duotone"
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-100">
                Preview unavailable
              </p>
              <p className="text-xs leading-5 text-zinc-400">
                This photo could not be prepared for viewing. Choose another
                photo.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {showScanError ? (
        <EmptyState
          action={
            onPickFolder
              ? {
                  label: "Choose Another Folder",
                  icon: <FolderOpenIcon size={15} weight="duotone" />,
                  onPress: onPickFolder,
                }
              : undefined
          }
          announcement="alert"
          description="Extents could not read this folder. Check its permissions or choose another folder."
          graphic={
            <WarningCircleIcon
              className="text-red-300/80"
              size={28}
              weight="duotone"
            />
          }
          title="Folder unavailable"
        />
      ) : null}

      {showNoFolder && !showScanError ? (
        <EmptyState
          action={
            onPickFolder
              ? {
                  label: "Open Folder",
                  icon: <FolderOpenIcon size={15} weight="duotone" />,
                  onPress: onPickFolder,
                }
              : undefined
          }
          graphic={<PhotoWorkflowGraphic />}
          title="Choose a folder to begin"
        />
      ) : null}

      {showEmptyFolder && !showScanError ? (
        <EmptyState
          description={`${folderName} does not contain a supported RAW or raster photo.`}
          graphic={
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-zinc-500">
              <FolderOpenIcon size={21} weight="duotone" />
            </span>
          }
          title="No supported photos found"
        />
      ) : null}

      {showFilteredEmpty && !showScanError ? (
        <EmptyState
          action={{ label: "Clear Filters", onPress: clearFilters }}
          title="No photos match these filters"
        />
      ) : null}

      {showNoSelection && !showScanError ? (
        <EmptyState
          compact
          graphic={
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-zinc-500">
              <ImageSquareIcon size={20} weight="duotone" />
            </span>
          }
          title="Select a photo"
        />
      ) : null}
    </div>
  );
});
