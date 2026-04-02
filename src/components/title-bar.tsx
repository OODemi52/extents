import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FolderOpenIcon,
  FunnelIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button, ButtonGroup } from "@heroui/button";
import { Spinner, Tooltip } from "@heroui/react";

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
        <Tooltip
          className="border border-zinc-500"
          closeDelay={0}
          content={"Open Folder"}
          delay={750}
          radius="sm"
          size="sm"
        >
          <Button
            disableRipple
            className="h-auto min-h-0 py-2 pr-8 text-left border border-zinc-700/50 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] bg-[rgba(30,30,30,0.99)] hover:bg-[rgba(50,50,50,0.99)] rounded-[17px] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]"
            radius="sm"
            size="sm"
            onPress={onPickFolder}
          >
            <div className="flex items-start gap-2">
              <FolderOpenIcon
                className="text-zinc-400 shrink-0"
                size={24}
                weight="fill"
              />
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
            </div>
          </Button>
        </Tooltip>
      </div>

      <div className="flex items-center space-x-2 max-w-3xl flex-1">
        <ButtonGroup className="border h-10 border-zinc-700/50 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] bg-[rgba(30,30,30,0.99)] rounded-[17px] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]">
          <ToolbarIconButton
            isDisabled
            icon={<ArrowLeftIcon size={20} />}
            isActive={false}
            tooltip="Back"
            onPress={() => console.log("back")}
          />
          <hr className="border border-zinc-700/70 h-2/5" />
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
          className="border h-10 w-10 border-zinc-700/50 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] bg-[rgba(30,30,30,0.99)] hover:bg-[rgba(50,50,50,0.99)] rounded-full drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]"
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
