import type { FlagEntry, FlagState, FlagValue } from "@/types/file-annotations";

import { create } from "zustand";

import { applyOptimisticAnnotationUpdate } from "@/features/annotate/utils/optimistic-annotations";
import { setFlags as _setFlags } from "@/services/api/annotations";

export const useFlagStore = create<FlagState>((set, get) => ({
  flags: {},

  setFlags: (entries) =>
    applyOptimisticAnnotationUpdate<FlagEntry, FlagValue>({
      annotations: entries,
      getCurrentAnnotations: () => get().flags,
      setAnnotations: (next) => set({ flags: next }),
      getPath: (entry) => entry.path,
      getValue: (entry) => entry.flag,
      defaultValue: "unflagged",
      persistFn: _setFlags,
      label: "flag",
    }),

  hydrateFlags: (entries) =>
    set((current) => ({
      flags: { ...current.flags, ...entries },
    })),
}));
