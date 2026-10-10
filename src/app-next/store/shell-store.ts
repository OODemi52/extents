import { create } from "zustand";
import { persist } from "zustand/middleware";

type ShellState = {
  rightPanelWidth: number;
  setRightPanelWidth: (width: number) => void;
};

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      rightPanelWidth: 300,
      setRightPanelWidth: (width) =>
        set({ rightPanelWidth: Math.min(420, Math.max(260, width)) }),
    }),
    {
      name: "extents-shell-exploration",
      partialize: (state) => ({ rightPanelWidth: state.rightPanelWidth }),
    },
  ),
);
