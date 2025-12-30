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

  cycleFlagsStatus: (paths, direction) => {
    if (!paths.length) {
      return;
    }

    const order: FlagValue[] = ["rejected", "unflagged", "picked"];
    const step = direction === "increase" ? 1 : -1;
    const { flags, setFlags } = get();
    const entries = paths.map((path) => {
      const current = flags[path] ?? "unflagged";
      const index = order.indexOf(current);
      const nextIndex =
        index === -1 ? -1 : (index + step + order.length) % order.length;

      return {
        path,
        value: index === -1 ? current : order[nextIndex],
      };
    });

    setFlags(entries);
  },

  hydrateFlags: (entries) =>
    set((current) => ({
      flags: { ...current.flags, ...entries },
    })),
}));
