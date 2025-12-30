import type { FlagState, FlagValue } from "@/types/file-annotations";

import { create } from "zustand";

import { applyOptimisticAnnotationUpdate } from "@/features/annotate/utils/optimistic-annotations";
import { setFlags as _setFlags } from "@/services/api/annotations";

export const useFlagStore = create<FlagState>((set, get) => ({
  flags: {},

  setFlags: (entries) =>
    applyOptimisticAnnotationUpdate<FlagValue>({
      annotations: entries,
      getCurrentAnnotationsState: () => get().flags,
      setAnnotations: (next) => set({ flags: next }),
      defaultValue: "unflagged",
      persistFn: _setFlags,
      label: "flag",
    }),

  toggleFlag: (path, flag) => {
    const current = get().flags[path] ?? "unflagged";
    const next = current === flag ? "unflagged" : flag;

    get().setFlags([{ path, value: next }]);
  },

  cycleFlagStatus: (path, direction) => {
    const order: FlagValue[] = ["rejected", "unflagged", "picked"];
    const current = get().flags[path] ?? "unflagged";
    const currentIndex = order.indexOf(current);
    const step = direction === "increase" ? 1 : -1;

    if (currentIndex === -1) {
      return;
    }

    const nextIndex = (currentIndex + step + order.length) % order.length;
    const next = order[nextIndex];

    get().setFlags([{ path, value: next }]);
  },

  hydrateFlags: (entries) =>
    set((current) => ({
      flags: { ...current.flags, ...entries },
    })),
}));
