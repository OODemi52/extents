import { MenuItem, Submenu } from "@tauri-apps/api/menu";

export const aboutMenu = await Submenu.new({
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
