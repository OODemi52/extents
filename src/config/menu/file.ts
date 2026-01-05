import { MenuItem, Submenu } from "@tauri-apps/api/menu";
import { open } from "@tauri-apps/plugin-dialog";

import { createSeparator } from "./standard";

import { useFileSystemStore } from "@/features/file-browser/store/file-system-store";

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

  const openFolder = await MenuItem.new({
    id: "file.open",
    text: "Open Folder...",
    accelerator: "Shift+CmdOrCtrl+O",
    action: async () => {
      const folderPath = await open({ directory: true });

      if (!folderPath) return;

      useFileSystemStore.getState().selectItem(folderPath);
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
      openFolder,
      separator,
      exportFiles,
      exportFilesWithPrevious,
      separator,
      editIn,
      migrateFrom,
    ],
  });
}
