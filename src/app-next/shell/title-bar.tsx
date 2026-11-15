import { memo } from "react";
import { Button } from "@heroui/react";
import { FunnelIcon, SidebarSimpleIcon } from "@phosphor-icons/react";

import { ActionButton } from "../components/action-button";
import { FolderContext } from "../components/folder-context";
import { ControlTooltip } from "../components/control-tooltip";

import { FilterTab } from "./filter-tab";

import { FilterSearchInput } from "@/features/filter/components/title-bar/search-input";
import { useFilterStore } from "@/features/filter/stores/filter-store";
import { useWindowFullscreen } from "@/hooks/use-window-fullscreen";
import { useLayoutStore } from "@/store/layout-store";

export const ShellTitleBar = memo(function ShellTitleBar({
  onPickFolder,
}: {
  onPickFolder: () => void;
}) {
  const fullscreen = useWindowFullscreen();
  const filtersOpen = useFilterStore((state) => state.isOpen);
  const toggleFilters = useFilterStore((state) => state.toggleOpen);
  const libraryOpen = useLayoutStore(
    (state) => state.panels.sidebar && !state.sidePanelsHidden,
  );
  const togglePanel = useLayoutStore((state) => state.togglePanel);
  const isMac = /Mac/i.test(navigator.userAgent);

  return (
    <header
      className="next-top-shell next-chrome"
      data-library-open={libraryOpen || undefined}
    >
      <div data-tauri-drag-region className="next-titlebar">
        <div data-tauri-drag-region className="next-titlebar-leading">
          {isMac && !fullscreen ? (
            <span
              data-tauri-drag-region
              className="next-window-controls-space"
            />
          ) : null}
          <div className="next-library-toggle">
            <ActionButton
              active={libraryOpen}
              aria-expanded={libraryOpen}
              label="Library"
              shortcut="P"
              onPress={() => togglePanel("sidebar")}
            >
              <SidebarSimpleIcon size={18} />
            </ActionButton>
          </div>
          <ControlTooltip
            label="Open folder"
            shortcut={isMac ? "Shift Cmd O" : "Shift Ctrl O"}
          >
            <Button
              aria-label="Open folder"
              className="next-folder-picker"
              size="sm"
              variant="ghost"
              onPress={onPickFolder}
            >
              <FolderContext />
            </Button>
          </ControlTooltip>
        </div>
        <div className="next-command-field">
          <FilterSearchInput />
          <div className="next-search-filter">
            <ActionButton
              active={filtersOpen}
              aria-controls="next-photo-filters"
              aria-expanded={filtersOpen}
              label={filtersOpen ? "Hide filters" : "Show filters"}
              onPress={toggleFilters}
            >
              <FunnelIcon size={18} />
            </ActionButton>
          </div>
        </div>
      </div>
      <FilterTab open={filtersOpen} />
    </header>
  );
});
