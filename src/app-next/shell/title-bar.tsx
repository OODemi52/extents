import type { ShellVariant } from "../experiment";

import { memo } from "react";
import { FolderOpenIcon, GearSixIcon } from "@phosphor-icons/react";

import { ActionButton } from "../components/action-button";
import { PanelControls } from "../components/panel-controls";

import { FilterSearchInput } from "@/features/filter/components/title-bar/search-input";
import { useSettingsStore } from "@/features/settings/stores/settings-store";
import { useWindowFullscreen } from "@/hooks/use-window-fullscreen";

export const ShellTitleBar = memo(function ShellTitleBar({
  onPickFolder,
  variant,
}: {
  onPickFolder: () => void;
  variant: ShellVariant;
}) {
  const fullscreen = useWindowFullscreen();
  const openSettings = useSettingsStore((state) => state.openSettingsModal);
  const isMac = /Mac/i.test(navigator.userAgent);

  return (
    <header data-tauri-drag-region className="next-titlebar next-chrome">
      <div data-tauri-drag-region className="next-titlebar-leading">
        {isMac && !fullscreen ? (
          <span data-tauri-drag-region className="next-window-controls-space" />
        ) : null}
        <span data-tauri-drag-region className="next-brand">
          Extents
          <span className="next-brand-dot" />
        </span>
      </div>
      <div className="next-command-field">
        <FilterSearchInput />
      </div>
      <div data-tauri-drag-region className="next-titlebar-trailing">
        {variant === "unified" ? <PanelControls filmstrip={false} /> : null}
        <ActionButton
          label="Open folder"
          shortcut={isMac ? "Shift Cmd O" : "Shift Ctrl O"}
          onPress={onPickFolder}
        >
          <FolderOpenIcon size={17} />
        </ActionButton>
        <ActionButton label="Settings" onPress={openSettings}>
          <GearSixIcon size={17} />
        </ActionButton>
      </div>
    </header>
  );
});
