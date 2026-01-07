import { MenuItem, Submenu } from "@tauri-apps/api/menu";

import {
  createHide,
  createHideOthers,
  createQuit,
  createSeparator,
  createServices,
  createShowAll,
} from "./standard";

import { useSettingsStore } from "@/features/settings/stores/settings-store";

export async function createAboutSubmenu() {
  const separator = await createSeparator();
  const services = await createServices();
  const showAll = await createShowAll();
  const hide = await createHide();
  const hideOthers = await createHideOthers();
  const quit = await createQuit();

  const about = await MenuItem.new({
    id: "about",
    text: "About",
    enabled: false,
  });

  const settings = await MenuItem.new({
    id: "settings",
    text: "Settings...",
    accelerator: "CmdOrCtrl+,",
    action: () => {
      useSettingsStore.getState().openSettingsModal();
    },
  });

  const updates = await MenuItem.new({
    id: "update",
    text: "Check for updates...",
    enabled: false,
  });

  return Submenu.new({
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
}
