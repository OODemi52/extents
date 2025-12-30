import { PredefinedMenuItem } from "@tauri-apps/api/menu";
import type { CheckMenuItem } from "@tauri-apps/api/menu";

export const setExclusiveChecked = (
  items: CheckMenuItem[],
  activeId?: string | null,
) => {
  items.forEach((item) => {
    void item.setChecked(activeId != null && item.id === activeId);
  });
};

// All
export const separator = await PredefinedMenuItem.new({
  item: "Separator",
});

// MacOS ----------------------------------------------------------------------------------
export const services = await PredefinedMenuItem.new({
  item: "Services",
});

export const showAll = await PredefinedMenuItem.new({
  item: "ShowAll",
});

// Windows --------------------------------------------------------------------------------

// MacOs & Windows ------------------------------------------------------------------------
export const hide = await PredefinedMenuItem.new({
  item: "Hide",
});

export const hideOthers = await PredefinedMenuItem.new({
  item: "HideOthers",
});

export const quit = await PredefinedMenuItem.new({
  item: "Quit",
});

// Linux ----------------------------------------------------------------------------------
