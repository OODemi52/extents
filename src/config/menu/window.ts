import { PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu";

import { separator } from "./standard";

const closeWindow = await PredefinedMenuItem.new({
  item: "CloseWindow",
  text: "Close Window",
});

const minimize = await PredefinedMenuItem.new({
  item: "Minimize",
  text: "Minimize",
});

const zoom = await PredefinedMenuItem.new({
  item: "Maximize",
  text: "Zoom",
});

const enterFullscreen = await PredefinedMenuItem.new({
  item: "Fullscreen",
  text: "Enter Full Screen",
});

export const windowSubmenu = await Submenu.new({
  text: "Window",
  items: [closeWindow, minimize, zoom, separator, enterFullscreen],
});
