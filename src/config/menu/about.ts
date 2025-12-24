import { MenuItem, Submenu } from "@tauri-apps/api/menu";

export const aboutMenu = await Submenu.new({
  text: "Extents", // get from app name
  items: [
    await MenuItem.new({
      id: "settings",
      text: "Settings...",
      accelerator: "CmdOrCtrl+,",
      action: () => {
        console.log("Settings Menu to be implemented");
      },
    }),
  ],
});
