import { create } from "zustand";

import { ImageExifEntry } from "@/types/exif";

type ExifState = {
  entriesByPath: Record<string, ImageExifEntry>;
  setEntries: (entries: ImageExifEntry[]) => void;
  clearEntries: () => void;
};

export const useExifStore = create<ExifState>((set) => ({
  entriesByPath: {},

  setEntries: (entries) => {
    const next: Record<string, ImageExifEntry> = {};

    entries.forEach((entry) => {
      next[entry.file_path] = entry;
    });

    set({ entriesByPath: next });
  },

  clearEntries: () => set({ entriesByPath: {} }),
}));
