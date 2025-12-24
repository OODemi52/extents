import { MenuItem, Submenu } from "@tauri-apps/api/menu";

export const photoSubmenu = await Submenu.new({
  text: "Edit",
  items: [
    await MenuItem.new({
      id: "edit.pick",
      text: "Pick",
      accelerator: "P",
      enabled: false,
      action: () => {
        console.log("Pick");
      },
    }),
    await MenuItem.new({
      id: "edit.reject",
      text: "Reject",
      accelerator: "X",
      enabled: false,
      action: () => {
        console.log("Reject");
      },
    }),
  ],
});
