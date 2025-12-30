import { Menu } from "@tauri-apps/api/menu";

import { createAboutSubmenu } from "./about";
import { createEditSubmenu } from "./edit";
import { createFileSubmenu } from "./file";
import { createPhotoSubmenu } from "./photo";
import { createViewSubmenu } from "./view";
import { createWindowSubmenu } from "./window";
import { createHelpSubmenu } from "./help";

export async function createAppMenu() {
  const [
    aboutSubmenu,
    fileSubmenu,
    editSubmenu,
    photoSubmenu,
    viewSubmenu,
    windowSubmenu,
    helpSubmenu,
  ] = await Promise.all([
    createAboutSubmenu(),
    createFileSubmenu(),
    createEditSubmenu(),
    createPhotoSubmenu(),
    createViewSubmenu(),
    createWindowSubmenu(),
    createHelpSubmenu(),
  ]);

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
