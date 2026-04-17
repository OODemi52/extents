import type { Sidecar } from "@/types/sidecar";

import { create } from "zustand";

type ActiveSidecarState = {
  imagePath: string | null;
  sidecar: Sidecar | null;
  dirty: boolean;
  hydrateSidecar: (imagePath: string, sidecar: Sidecar) => void;
  setSidecar: (sidecar: Sidecar) => void;
  clearSidecar: () => void;
  markDirty: () => void;
  markClean: () => void;
};

export const useActiveSidecarStore = create<ActiveSidecarState>((set) => ({
  imagePath: null,
  sidecar: null,
  dirty: false,

  hydrateSidecar: (imagePath, sidecar) =>
    set({
      imagePath,
      sidecar,
      dirty: false,
    }),

  setSidecar: (sidecar) =>
    set((state) => {
      if (!state.imagePath) {
        return {};
      }

      return {
        sidecar,
        dirty: true,
      };
    }),

  clearSidecar: () =>
    set({
      imagePath: null,
      sidecar: null,
      dirty: false,
    }),

  markDirty: () => set({ dirty: true }),
  markClean: () => set({ dirty: false }),
}));
