import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FunnelIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button, ButtonGroup } from "@heroui/button";
import { Spinner } from "@heroui/react";

import { ToolbarIconButton } from "./ui/buttons/toolbar-icon-button";

import { FilterSearchInput } from "@/features/filter/components/title-bar/search-input";
import { SortSelect } from "@/features/filter/components/title-bar/sort-select";
import { useFilterStore } from "@/features/filter/stores/filter-store";
import { useWindowFullscreen } from "@/hooks/use-window-fullscreen";
import { useImageStore } from "@/store/image-store";

interface TitleBarProps {
  onPickFolder: () => void;
}

export function TitleBar({ onPickFolder }: TitleBarProps) {
  const isFilterOpen = useFilterStore((state) => state.isOpen);
  const toggleFilter = useFilterStore((state) => state.toggleOpen);
  const { currentFolderPath, files, isLoading } = useImageStore();

  const folderName = currentFolderPath
    ? (currentFolderPath.split(/[/\\]/).filter(Boolean).pop() ??
      "Unnamed Folder")
    : "Select Folder";
  const photoCount = files.length;
  const photoCountLabel = currentFolderPath
    ? `${photoCount} photo${photoCount === 1 ? "" : "s"}`
    : "No photos";
  const isMac =
    typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);
  const trafficLightsClass = isMac ? "w-[72px]" : "w-2";
  const isFullscreen = useWindowFullscreen();

  return (
    <div
      data-tauri-drag-region
      className="w-full flex items-center justify-between py-1 px-2"
    >
      <div className="flex items-center gap-2 min-w-0">
        {isMac && !isFullscreen && (
          <div className={`${trafficLightsClass} shrink-0`} />
        )}
        <Button
          disableRipple
          className="h-auto min-h-0 px-2 py-1 text-left bg-transparent hover:bg-white/5"
          radius="sm"
          size="sm"
          onPress={onPickFolder}
        >
          <span className="flex flex-col leading-tight text-left">
            <span className="max-w-[160px] truncate text-xs font-semibold text-zinc-100 [text-shadow:0.5px_0_0_rgba(0,0,0,0.6),-0.5px_0_0_rgba(0,0,0,0.6),0_0.5px_0_rgba(0,0,0,0.6),0_-0.5px_0_rgba(0,0,0,0.6)]">
              {folderName}
            </span>
            <span className="flex h-[18px] items-center">
              {isLoading ? (
                <Spinner
                  className="origin-left scale-[0.7]"
                  color="default"
                  variant="dots"
                />
              ) : (
                <span className="text-[10px] leading-none text-zinc-400 [text-shadow:0.5px_0_0_rgba(0,0,0,0.6),-0.5px_0_0_rgba(0,0,0,0.6),0_0.5px_0_rgba(0,0,0,0.6),0_-0.5px_0_rgba(0,0,0,0.6)]">
                  {photoCountLabel}
                </span>
              )}
            </span>
          </span>
        </Button>
      </div>

      <div className="flex items-center space-x-2 max-w-3xl flex-1">
        <ButtonGroup>
          <ToolbarIconButton
            isDisabled
            icon={<ArrowLeftIcon size={20} />}
            isActive={false}
            tooltip="Back"
            onPress={() => console.log("back")}
          />
          <ToolbarIconButton
            isDisabled
            icon={<ArrowRightIcon size={20} />}
            isActive={false}
            tooltip="Forward"
            onPress={() => console.log("forward")}
          />
        </ButtonGroup>

        <FilterSearchInput />

        <ToolbarIconButton
          icon={<FunnelIcon size={20} weight="duotone" />}
          isActive={isFilterOpen}
          tooltip={isFilterOpen ? "Hide filters" : "Show filters"}
          onPress={toggleFilter}
        />

        <SortSelect />
      </div>

      {/* Load bearing div, used as a spacer/padding */}
      <div className="w-1" />
    </div>
  );
}
