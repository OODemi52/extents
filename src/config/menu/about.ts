import { MenuItem, Submenu } from "@tauri-apps/api/menu";

import {
  hide,
  hideOthers,
  quit,
  separator,
  services,
  showAll,
} from "./standard";

const about = await MenuItem.new({
  id: "about",
  text: "About",
  enabled: false,
});

const settings = await MenuItem.new({
  id: "settings",
  text: "Settings...",
  accelerator: "CmdOrCtrl+,",
  enabled: false,
});

const updates = await MenuItem.new({
  id: "update",
  text: "Check for updates...",
  enabled: false,
});

export const aboutSubmenu = await Submenu.new({
  text: "Extents", // get from app name
  items: [
    about,
    settings,
    updates,
    separator,
    services,
    separator,
    hide,
    hideOthers,
    showAll,
    separator,
    quit,
  ],
});
