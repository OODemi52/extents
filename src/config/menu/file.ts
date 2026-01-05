import { MenuItem, Submenu } from "@tauri-apps/api/menu";
import { useFolderScanner } from "@/hooks/use-folder-scanner";

import { createSeparator } from "./standard";

export async function createFileSubmenu() {
  const separator = await createSeparator();

  const search = await MenuItem.new({
    id: "file.search",
    text: "Search Photos",
    accelerator: "CmdOrCtrl+F",
    action: () => {
      const searchInput = document.getElementById("file-search");

      searchInput?.focus();
    },
  });

  const importFiles = await MenuItem.new({
    id: "file.import",
    text: "Import...",
    enabled: false,
    accelerator: "Shift+CmdOrCtrl+I",
  });

  const open = await MenuItem.new({
    id: "file.open",
    text: "Open Folder...",
    enabled: false,
    accelerator: "Shift+CmdOrCtrl+O",
    action: () => {
      openF;
    },
  });

  const exportFiles = await MenuItem.new({
    id: "file.export",
    text: "Export...",
    enabled: false,
    accelerator: "Shift+E",
  });

  const exportFilesWithPrevious = await MenuItem.new({
    id: "file.export-with-previous",
    text: "Export with Previous...",
    enabled: false,
    accelerator: "CmdOrCtrl+E",
  });

  const editIn = await MenuItem.new({
    id: "file.editIn",
    text: "Edit In...",
    enabled: false,
  });

  const migrateFrom = await MenuItem.new({
    id: "file.migrateFrom",
    text: "Migrate from...",
    enabled: false,
  });

  return Submenu.new({
    text: "File",
    items: [
      search,
      separator,
      importFiles,
      separator,
      exportFiles,
      exportFilesWithPrevious,
      separator,
      editIn,
      migrateFrom,
    ],
  });
}
