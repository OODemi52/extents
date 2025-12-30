import { Menu } from "@tauri-apps/api/menu";

import { aboutSubmenu } from "./about";
import { editSubmenu } from "./edit";
import { fileSubmenu } from "./file";
import { photoSubmenu } from "./photo";
import { viewSubmenu } from "./view";
import { windowSubmenu } from "./window";
import { helpSubmenu } from "./help";

export async function createAppMenu() {
  const menu = await Menu.new({
    items: [
      aboutSubmenu,
      fileSubmenu,
      editSubmenu,
      photoSubmenu,
      viewSubmenu,
      windowSubmenu,
      helpSubmenu,
    ],
  });

  await menu.setAsAppMenu();

  return {
    menu,
    fileSubmenu,
    editSubmenu,
    photoSubmenu,
    viewSubmenu,
    windowSubmenu,
    helpSubmenu,
  };
}
