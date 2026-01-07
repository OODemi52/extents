import { create } from "zustand";

interface SettingsStore {
  isSettingsModalOpen: boolean;
  cacheSize: number | null;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  setCacheSize: (size: number) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  isSettingsModalOpen: false,
  cacheSize: null,
  openSettingsModal: () => set({ isSettingsModalOpen: true }),
  closeSettingsModal: () => set({ isSettingsModalOpen: false }),
  setCacheSize: (size) => set({ cacheSize: size }),
}));
