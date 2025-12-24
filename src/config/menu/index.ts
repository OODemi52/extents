import { Menu } from "@tauri-apps/api/menu";

import { aboutSubmenu } from "./about";
import { editSubmenu } from "./edit";
import { fileSubmenu } from "./file";

export async function createAppMenu() {
  const menu = await Menu.new({
    items: [aboutSubmenu, fileSubmenu, editSubmenu],
  });

  await menu.setAsAppMenu();

  return {
    menu,
    fileSubmenu,
    editSubmenu,
  };
}
