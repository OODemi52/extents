import { memo, useCallback, useEffect, useRef } from "react";
import { Skeleton } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { FolderOpenIcon, WarningCircleIcon } from "@phosphor-icons/react";

import { usePrefetchThumbnails } from "../hooks/use-thumbnails";
import { useScrubbing } from "../hooks/use-scrubbing";

import { VirtualGrid, type VirtualGridHandle } from "./virtual-grid";

import { EmptyState, PhotoWorkflowGraphic } from "@/components/ui/empty-state";
import { useImageLoader } from "@/hooks/use-image-loader";
import { useImageStore } from "@/store/image-store";
import {
  getFilteredImagePaths,
  useFilteredImages,
} from "@/features/filter/hooks/use-filtered-files";
import { FilterMenuBar } from "@/features/filter/components/menu-bar/menu-bar";
import { useFilterStore } from "@/features/filter/stores/filter-store";
import { useGalleryPreferencesStore } from "@/features/gallery/stores/gallery-preferences-store";
import { useLayoutStore } from "@/store/layout-store";
import { imagePreviewQueryOptions } from "@/features/interaction-viewport/hooks/use-image-preview";

type GridProps = {
  active?: boolean;
  onPickFolder?: () => void;
  showFilters?: boolean;
};

const EMPTY_SELECTED_PATHS = new Set<string>();

export const Grid = memo(function Grid({
  active = true,
  onPickFolder,
  showFilters = true,
}: GridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const virtualGridRef = useRef<VirtualGridHandle>(null);

  const currentFolderPath = useImageStore((state) =>
    active ? state.currentFolderPath : null,
  );
  const fileCount = useImageStore((state) => (active ? state.files.length : 0));
  const folderScanError = useImageStore((state) =>
    active ? state.folderScanError : null,
  );
  const isLoading = useImageStore((state) =>
    active ? state.isLoading : false,
  );
  const selectedPath = useImageStore((state) =>
    active && state.selectedIndex !== null
      ? (state.files[state.selectedIndex]?.path ?? null)
      : null,
  );
  const selectedPaths = useImageStore((state) =>
    active ? state.selectedPaths : EMPTY_SELECTED_PATHS,
  );
  const deselectAll = useImageStore((state) => state.deselectAll);
  const filteredFiles = useFilteredImages(active);
  const queryClient = useQueryClient();
  const { handleSelectImageByPath } = useImageLoader();
  const { startScrubbing } = useScrubbing();

  const handleSelect = useCallback(
    (path: string, selectionMode?: "single" | "multi") => {
      handleSelectImageByPath(path, selectionMode);
      containerRef.current?.focus({ preventScroll: true });
    },
    [handleSelectImageByPath],
  );
  const prefetchThumbnails = usePrefetchThumbnails(active);
  const isFilterOpen = useFilterStore((state) =>
    active && showFilters ? state.isOpen : false,
  );
  const clearFilters = useFilterStore((state) => state.clearFilters);
  const setActiveLayout = useLayoutStore((state) => state.setActiveLayout);
  const showFileNameInGrid = useGalleryPreferencesStore(
    (state) => state.showFileNameInGrid,
  );
  const showFileExtensionInGrid = useGalleryPreferencesStore(
    (state) => state.showFileExtensionInGrid,
  );

  const filteredPaths = getFilteredImagePaths(filteredFiles);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.defaultPrevented) {
        return;
      }

      const currentPath = selectedPath;

      const currentIndex = currentPath
        ? filteredPaths.indexOf(currentPath)
        : -1;
      const columns = virtualGridRef.current?.getColumns() ?? 1;

      const selectByIndex = (index: number) => {
        const path = filteredPaths[index];

        if (!path || path === currentPath) {
          return;
        }

        startScrubbing();
        handleSelectImageByPath(path);
      };

      let delta = 0;

      if (event.key === "ArrowUp") {
        delta = -columns;
      } else if (event.key === "ArrowDown") {
        delta = columns;
      }

      if (delta !== 0) {
        event.preventDefault();

        if (filteredPaths.length === 0) {
          return;
        }

        const baseIndex =
          currentIndex !== -1
            ? currentIndex
            : delta > 0
              ? -1
              : filteredPaths.length;
        const nextIndex = Math.min(
          Math.max(baseIndex + delta, 0),
          filteredPaths.length - 1,
        );

        if (nextIndex !== baseIndex) {
          selectByIndex(nextIndex);
        }
      } else if (event.key === "Home") {
        event.preventDefault();
        selectByIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        selectByIndex(filteredPaths.length - 1);
      } else if (event.key === "Enter" && currentIndex >= 0) {
        event.preventDefault();
        setActiveLayout("detail");
        window.requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>('[data-detail-navigation="true"]')
            ?.focus({ preventScroll: true });
        });
      } else if (event.key === " " && currentPath) {
        event.preventDefault();
        handleSelectImageByPath(currentPath, "multi");
      } else if (event.key === "Escape") {
        event.preventDefault();
        deselectAll();
      }
    },
    [
      filteredPaths,
      handleSelectImageByPath,
      selectedPath,
      startScrubbing,
      setActiveLayout,
      deselectAll,
    ],
  );

  const activeFilteredIndex = selectedPath
    ? filteredPaths.indexOf(selectedPath)
    : -1;

  useEffect(() => {
    if (!active || !selectedPath) return;

    void queryClient.prefetchQuery(imagePreviewQueryOptions(selectedPath));
  }, [active, queryClient, selectedPath]);

  useEffect(() => {
    if (!active || !selectedPath || filteredFiles.length === 0) return;
    const index = filteredFiles.findIndex((file) => file.path === selectedPath);

    if (index >= 0) {
      virtualGridRef.current?.scrollToIndex(index, "auto");
    }
  }, [active, selectedPath, filteredFiles]);

  const hasOpenFolder = Boolean(currentFolderPath);
  const showNoFolder =
    active && !isLoading && !hasOpenFolder && fileCount === 0;
  const showEmptyFolder =
    active &&
    !isLoading &&
    hasOpenFolder &&
    fileCount === 0 &&
    !folderScanError;
  const showFilteredEmpty =
    active && !isLoading && fileCount > 0 && filteredFiles.length === 0;
  const folderName =
    currentFolderPath?.split(/[/\\]/).filter(Boolean).pop() ?? "This folder";

  return (
    <div className="flex h-full w-full flex-col">
      {showFilters ? (
        <div
          aria-hidden={!isFilterOpen}
          className={`w-full shrink-0 overflow-hidden transition-[max-height,opacity,transform] duration-200 ${
            isFilterOpen
              ? "max-h-12 opacity-100 translate-y-0 pointer-events-auto"
              : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
          }`}
          data-filter-ui="true"
          inert={!isFilterOpen || undefined}
        >
          {active ? <FilterMenuBar /> : null}
        </div>
      ) : null}
      <div
        ref={containerRef}
        aria-activedescendant={
          activeFilteredIndex >= 0
            ? `photo-grid-option-${activeFilteredIndex}`
            : undefined
        }
        aria-busy={isLoading}
        aria-label="Photos"
        aria-multiselectable={filteredFiles.length > 0 ? true : undefined}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1 pb-6"
        data-photo-navigation="true"
        role={filteredFiles.length > 0 ? "listbox" : "region"}
        style={{ contain: "strict" }}
        tabIndex={filteredFiles.length > 0 ? 0 : -1}
        onKeyDown={handleKeyDown}
      >
        {active && isLoading && fileCount === 0 ? (
          <div
            aria-label="Scanning folder"
            className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 pt-2"
            role="status"
          >
            {Array.from({ length: 12 }, (_, index) => (
              <Skeleton
                key={index}
                className="aspect-square rounded-[16px] bg-zinc-800/70"
              />
            ))}
          </div>
        ) : folderScanError ? (
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
            className="h-full"
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
        ) : showNoFolder ? (
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
            className="h-full"
            graphic={<PhotoWorkflowGraphic />}
            title="Choose a folder to begin"
          />
        ) : showEmptyFolder ? (
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
            className="h-full"
            description={`${folderName} does not contain a supported RAW or raster photo.`}
            graphic={
              <FolderOpenIcon
                className="text-zinc-500"
                size={28}
                weight="duotone"
              />
            }
            title="No supported photos found"
          />
        ) : showFilteredEmpty ? (
          <EmptyState
            action={{ label: "Clear Filters", onPress: clearFilters }}
            className="h-full"
            title="No photos match these filters"
          />
        ) : (
          <VirtualGrid
            ref={virtualGridRef}
            active={active}
            files={filteredFiles}
            prefetchThumbnails={prefetchThumbnails}
            scrollElementRef={containerRef}
            selectedPath={selectedPath ?? null}
            selectedPaths={selectedPaths}
            showFileExtensionInGrid={showFileExtensionInGrid}
            showFileNameInGrid={showFileNameInGrid}
            onSelect={handleSelect}
          />
        )}
      </div>
    </div>
  );
});
