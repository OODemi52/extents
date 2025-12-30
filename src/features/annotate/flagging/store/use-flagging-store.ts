import { create } from "zustand";

import { setFlags as _setFlags } from "@/services/api/annotations";
import { FlagState, FlagValue } from "@/types/file-annotations";

export const useFlagStore = create<FlagState>((set, get) => ({
  flags: {},

  setFlags: (entries) => {
    if (!entries.length) {
      return;
    }

    const previousFlags = entries.reduce<Record<string, FlagValue>>(
      (accumulator, entry) => {
        accumulator[entry.path] = get().flags[entry.path] ?? "unflagged";

        return accumulator;
      },
      {},
    );

    set((current) => {
      const nextFlags = { ...current.flags };

      entries.forEach(({ path, flag }) => {
        nextFlags[path] = flag;
      });

      return { flags: nextFlags };
    });

    void _setFlags(entries).catch((err) => {
      console.error("[flag] persist failed", err);
      set((current) => ({
        flags: { ...current.flags, ...previousFlags },
      }));
    });
  },

  hydrateFlags: (entries) =>
    set((current) => ({
      flags: { ...current.flags, ...entries },
    })),
}));
