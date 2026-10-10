import { memo } from "react";
import { Button, Spinner } from "@heroui/react";
import { FolderOpenIcon, FunnelIcon } from "@phosphor-icons/react/dist/ssr";

import { ToolbarIconButton } from "./ui/buttons/toolbar-icon-button";
import { EditorTooltip } from "./ui/editor-tooltip";

import { FilterSearchInput } from "@/features/filter/components/title-bar/search-input";
import { SortSelect } from "@/features/filter/components/title-bar/sort-select";
import { useFilterStore } from "@/features/filter/stores/filter-store";
import { useWindowFullscreen } from "@/hooks/use-window-fullscreen";
import { useImageStore } from "@/store/image-store";

interface TitleBarProps {
  onPickFolder: () => void;
}

export const TitleBar = memo(function TitleBar({
  onPickFolder,
}: TitleBarProps) {
  const isFilterOpen = useFilterStore((state) => state.isOpen);
  const toggleFilter = useFilterStore((state) => state.toggleOpen);
  const currentFolderPath = useImageStore((state) => state.currentFolderPath);
  const photoCount = useImageStore((state) => state.files.length);
  const isLoading = useImageStore((state) => state.isLoading);

  const folderName = currentFolderPath
    ? (currentFolderPath.split(/[/\\]/).filter(Boolean).pop() ??
      "Unnamed Folder")
    : "Select Folder";
  const photoCountLabel = currentFolderPath
    ? `${photoCount} photo${photoCount === 1 ? "" : "s"}`
    : null;
  const isMac =
    typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);
  const isFullscreen = useWindowFullscreen();

  return (
    <header
      data-tauri-drag-region
      className="grid h-14 w-full grid-cols-[minmax(210px,1fr)_minmax(280px,520px)_minmax(210px,1fr)] items-center gap-3 px-2 py-1"
    >
      <div data-tauri-drag-region className="flex min-w-0 items-center gap-2">
        {isMac && !isFullscreen ? (
          <div data-tauri-drag-region className="w-[72px] shrink-0" />
        ) : null}
        <EditorTooltip content="Choose photo folder" delay={650} offset={6}>
          <Button
            aria-busy={isLoading}
            aria-label={
              currentFolderPath
                ? `Choose a different folder. Current folder: ${folderName}`
                : "Choose a photo folder"
            }
            className="editor-control-surface editor-focus-ring min-h-10 w-auto min-w-0 max-w-[190px] flex-none justify-start rounded-[17px] px-2.5 py-1.5 text-left data-[hover=true]:bg-white/[0.055]"
            size="sm"
            variant="ghost"
            onPress={onPickFolder}
          >
            <div className="flex p-2 min-w-0 items-center gap-2">
              <FolderOpenIcon
                className="shrink-0 text-zinc-400"
                size={20}
                weight="fill"
              />
              <span className="app-selectable-text flex min-w-0 flex-col text-left leading-tight">
                <span className="truncate text-xs font-semibold text-zinc-100">
                  {folderName}
                </span>
                <span className="flex h-4 items-center">
                  {isLoading ? (
                    <Spinner
                      aria-label="Scanning folder"
                      className="origin-left scale-[0.1]"
                      color="current"
                    />
                  ) : (
                    <span className="truncate text-[11px] leading-none text-zinc-400">
                      {photoCountLabel}
                    </span>
                  )}
                </span>
              </span>
            </div>
          </Button>
        </EditorTooltip>
      </div>

      <div data-tauri-drag-region className="flex min-w-0">
        <FilterSearchInput />
      </div>

      <div
        data-tauri-drag-region
        className="flex min-w-0 items-center justify-start gap-2"
      >
        <ToolbarIconButton
          className="editor-control-surface h-10 w-10 min-w-10 rounded-full"
          icon={<FunnelIcon size={20} weight="duotone" />}
          isActive={isFilterOpen}
          tooltip={isFilterOpen ? "Hide filters" : "Show filters"}
          onPress={toggleFilter}
        />

        <SortSelect />
      </div>
    </header>
  );
});
