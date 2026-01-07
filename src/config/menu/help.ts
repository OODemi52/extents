import { MenuItem, Submenu } from "@tauri-apps/api/menu";

import { createSeparator } from "./standard";

export async function createHelpSubmenu() {
  const separator = await createSeparator();

  const extentsHelp = await MenuItem.new({
    id: "help.extentsHelp",
    text: "Extents Help...",
    enabled: false,
  });

  const keyboardShortcuts = await MenuItem.new({
    id: "help.keyboardShortcuts",
    text: "Keyboard Shortcuts...",
    enabled: false,
  });

  const reportBug = await MenuItem.new({
    id: "help.support.reportBug",
    text: "Report a Bug...",
    enabled: false,
  });

  const requestFeature = await MenuItem.new({
    id: "help.support.requestFeature",
    text: "Request a Feature...",
    enabled: false,
  });

  const feedbackSubmenu = await Submenu.new({
    text: "Leave Feedback",
    items: [reportBug, requestFeature],
  });

  const systemInfo = await MenuItem.new({
    id: "help.systemInfo",
    text: "System Info...",
    enabled: false,
  });

  const resourceUtilization = await MenuItem.new({
    id: "help.resourceUtilization",
    text: "Resource Utilization...",
    enabled: false,
  });

  const acknowledgements = await MenuItem.new({
    id: "help.acknowledgements",
    text: "Acknowledgements",
    enabled: false,
  });

  return Submenu.new({
    text: "Help",
    items: [
      extentsHelp,
      keyboardShortcuts,
      separator,
      feedbackSubmenu,
      separator,
      systemInfo,
      resourceUtilization,
      separator,
      acknowledgements,
    ],
  });
}
