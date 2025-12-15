import { create } from "zustand";

export type FlagState = "unflagged" | "flagged" | "rejected";

type FlagStateStore = {
  flags: Record<string, FlagState>;
  setFlag: (path: string, state: FlagState) => void;
};

export const useFlagStore = create<FlagStateStore>((set) => ({
  flags: {},
  setFlag: (path, state) =>
    set((curr) => ({
      flags: { ...curr.flags, [path]: state },
    })),
}));
