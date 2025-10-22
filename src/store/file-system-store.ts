import { Selection } from "@heroui/react";
import { create } from "zustand";

interface FileSystemState {
  selectedId: string | null;
  expandedKeys: Selection;
  selectItem: (id: string) => void;
  setExpandedKeys: (keys: Selection) => void;
}

export const useFileSystemStore = create<FileSystemState>((set) => ({
  selectedId: null,
  expandedKeys: new Set(["/"]),
  selectItem: (id) => set({ selectedId: id }),
  setExpandedKeys: (keys) => set({ expandedKeys: keys }),
}));
