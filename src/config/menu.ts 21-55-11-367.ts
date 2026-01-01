import { Menu, MenuItem, Submenu } from "@tauri-apps/api/menu";

export async function createAppMenu() {
  const aboutMenu = await Submenu.new({
    text: "Extents", // get from app name
    items: [
      await MenuItem.new({
        id: "preferences",
        text: "Preferences...",
        accelerator: "CmdOrCtrl+,",
        action: () => {
          console.log("Preferences Menu to be implemented");
        },
      }),
    ],
  });
  const fileSubmenu = await Submenu.new({
    text: "File",
    items: [
      await MenuItem.new({
        id: "file.import",
        text: "Import…",
        accelerator: "CmdOrCtrl+I",
        action: () => {
          console.log("Import");
        },
      }),
      await MenuItem.new({
        id: "file.export",
        text: "Export…",
        accelerator: "CmdOrCtrl+E",
        enabled: false, // dynamic
        action: () => {
          console.log("Export");
        },
      }),
    ],
  });

  const photoSubmenu = await Submenu.new({
    text: "Photo",
    items: [
      await MenuItem.new({
        id: "photo.pick",
        text: "Pick",
        accelerator: "P",
        enabled: false,
        action: () => {
          console.log("Pick");
        },
      }),
      await MenuItem.new({
        id: "photo.reject",
        text: "Reject",
        accelerator: "X",
        enabled: false,
        action: () => {
          console.log("Reject");
        },
      }),
    ],
  });

  const viewSubmenu = await Submenu.new({
    text: "View",
    items: [
      await MenuItem.new({
        id: "view.grid",
        text: "Grid",
        accelerator: "G",
      }),
      await MenuItem.new({
        id: "view.editor",
        text: "Editor",
        accelerator: "E",
      }),
    ],
  });

  const menu = await Menu.new({
    items: [aboutMenu, fileSubmenu, photoSubmenu, viewSubmenu],
  });

  await menu.setAsAppMenu();

  return {
    menu,
    fileSubmenu,
    photoSubmenu,
  };
}
