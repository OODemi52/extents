import { MenuItem, Submenu } from "@tauri-apps/api/menu";
import { openUrl } from "@tauri-apps/plugin-opener";

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
    action: async () =>
      await openUrl(
        "https://github.com/OODemi52/extents/issues/new?template=bug-report.md",
      ),
  });

  const requestFeature = await MenuItem.new({
    id: "help.support.requestFeature",
    text: "Request a Feature...",
    action: async () =>
      await openUrl(
        "https://github.com/OODemi52/extents/issues/new?template=feature-request.md",
      ),
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
