import { create } from "zustand";

import { setFlag as setFlagApi } from "@/services/api/annotations";
import { FlagState } from "@/types/file-annotations";

export const useFlagStore = create<FlagState>((set, get) => ({
  flags: {},
  setFlag: (path, state) => {
    const next = state;

    set((current) => ({
      flags: { ...current.flags, [path]: next },
    }));

    void setFlagApi(path, next).catch((err) => {
      console.error("[flag] persist failed", err);
      const prev = get().flags[path] ?? "unflagged";

      set((current) => ({ flags: { ...current.flags, [path]: prev } }));
    });
  },
  setFlags: (entries) =>
    set((current) => ({
      flags: { ...current.flags, ...entries },
    })),
}));
