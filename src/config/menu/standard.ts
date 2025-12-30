import type { CheckMenuItem } from "@tauri-apps/api/menu";

import { PredefinedMenuItem } from "@tauri-apps/api/menu";

export const setExclusiveChecked = (
  items: CheckMenuItem[],
  activeId?: string | null,
) => {
  items.forEach((item) => {
    void item.setChecked(activeId != null && item.id === activeId);
  });
};

// All
export const createSeparator = () =>
  PredefinedMenuItem.new({
    item: "Separator",
  });

// MacOS ----------------------------------------------------------------------------------
export const createServices = () =>
  PredefinedMenuItem.new({
    item: "Services",
  });

export const createShowAll = () =>
  PredefinedMenuItem.new({
    item: "ShowAll",
  });

// Windows --------------------------------------------------------------------------------

// MacOs & Windows ------------------------------------------------------------------------
export const createHide = () =>
  PredefinedMenuItem.new({
    item: "Hide",
  });

export const createHideOthers = () =>
  PredefinedMenuItem.new({
    item: "HideOthers",
  });

export const createQuit = () =>
  PredefinedMenuItem.new({
    item: "Quit",
  });

// Linux ----------------------------------------------------------------------------------
