import { Menu } from "@tauri-apps/api/menu";

import { aboutSubmenu } from "./about";
import { photoSubmenu } from "./edit";
import { fileSubmenu } from "./file";

export async function createAppMenu() {
  const menu = await Menu.new({
    items: [aboutSubmenu, fileSubmenu, photoSubmenu],
  });

  await menu.setAsAppMenu();

  return {
    menu,
    fileSubmenu,
    photoSubmenu,
  };
}
