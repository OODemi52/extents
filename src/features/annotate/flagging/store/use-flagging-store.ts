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

  hydrateFlags: (entries) =>
    set((current) => ({
      flags: { ...current.flags, ...entries },
    })),
}));
