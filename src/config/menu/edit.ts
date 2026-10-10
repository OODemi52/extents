import { MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu";

import { createSeparator } from "./standard";

import { getFilteredPaths } from "@/features/filter/hooks/use-filtered-files";
import { useImageStore } from "@/store/image-store";

const selectFocusedEditableContent = () => {
  const activeElement = document.activeElement;

  if (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  ) {
    activeElement.select();

    return true;
  }

  if (activeElement instanceof HTMLElement && activeElement.isContentEditable) {
    const selection = window.getSelection();

    if (!selection) return false;

    const range = document.createRange();

    range.selectNodeContents(activeElement);
    selection.removeAllRanges();
    selection.addRange(range);

    return true;
  }

  return false;
};

export async function createEditSubmenu() {
  const separator = await createSeparator();

  const undo = await PredefinedMenuItem.new({
    item: "Undo",
    text: "Undo",
  });

  const redo = await PredefinedMenuItem.new({
    item: "Redo",
    text: "Redo",
  });

  const revert = await MenuItem.new({
    id: "revert",
    text: "Revert to Original",
    enabled: false,
    accelerator: "Alt + R",
  });

  const cut = await PredefinedMenuItem.new({
    item: "Cut",
    text: "Cut",
  });

  const copy = await PredefinedMenuItem.new({
    item: "Copy",
    text: "Copy",
  });

  const paste = await PredefinedMenuItem.new({
    item: "Paste",
    text: "Paste",
  });

  const selectAll = await MenuItem.new({
    id: "select-all",
    text: "Select All",
    enabled: true,
    accelerator: "CmdOrCtrl + A",
    action: () => {
      if (selectFocusedEditableContent()) return;

      useImageStore.getState().selectAll(getFilteredPaths());
    },
  });

  const selectInverse = await MenuItem.new({
    id: "select-inverse",
    text: "Select Inverse",
    enabled: true,
    accelerator: "CmdOrCtrl + Shift + A",
    action: () => {
      useImageStore.getState().selectInverse(getFilteredPaths());
    },
  });

  const deselectAll = await MenuItem.new({
    id: "deselect-all",
    text: "Deselect All",
    enabled: true,
    accelerator: "CmdOrCtrl + D",
    action: () => {
      useImageStore.getState().deselectAll();
    },
  });

  const previous = await MenuItem.new({
    id: "previous",
    text: "Previous Photo",
    enabled: false,
    accelerator: "Left",
  });

  const next = await MenuItem.new({
    id: "next",
    text: "Next Photo",
    enabled: false,
    accelerator: "Right",
  });

  const albumSubmenu = await Submenu.new({
    text: "Albums",
    items: [],
    enabled: false,
  });

  const stacksSubmenu = await Submenu.new({
    text: "Stacks",
    items: [],
    enabled: false,
  });

  const duplicate = await MenuItem.new({
    id: "duplicate",
    text: "Duplicate Photo(s)",
    enabled: false,
    accelerator: "CmdOrCtrl + J",
  });

  const trash = await MenuItem.new({
    id: "trash",
    text: "Trash Photo(s)",
    enabled: false,
    accelerator: "Delete",
  });

  const remove = await MenuItem.new({
    id: "remove",
    text: "Remove Photo(s)",
    enabled: false,
    accelerator: "CmdOrCtrl + Delete",
  });

  const archive = await MenuItem.new({
    id: "archive",
    text: "Archive Photo(s)",
    enabled: false,
    accelerator: "CmdOrCtrl + Shift + Delete",
  });

  return Submenu.new({
    text: "Edit",
    items: [
      undo,
      redo,
      separator,
      revert,
      separator,
      cut,
      copy,
      paste,
      separator,
      selectAll,
      selectInverse,
      deselectAll,
      separator,
      previous,
      next,
      separator,
      albumSubmenu,
      stacksSubmenu,
      separator,
      duplicate,
      separator,
      trash,
      remove,
      archive,
    ],
  });
}
