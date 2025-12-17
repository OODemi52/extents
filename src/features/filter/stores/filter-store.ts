import { create } from "zustand";

import { FlagValue } from "@/types/file-annotations";

type SortField =
  | "name"
  | "size"
  | "ext"
  | "rating"
  | "flag"
  | "addedAt"
  | "modifiedAt";
type SortDirection = "asc" | "desc";
type Comparator = "gte" | "lte" | "eq";
type RatingFilter = { operation: Comparator; value: number } | null;
type SizeFilter = { operation: Comparator; value: number } | null;

interface FilterState {
  isOpen: boolean;
  search: string;
  sort: { field: SortField; direction: SortDirection };
  rating: RatingFilter;
  flags: FlagValue[];
  exts: string[];
  size: SizeFilter;
  edited: boolean | null;

  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setSearch: (search: string) => void;
  setSort: (sort: Partial<FilterState["sort"]>) => void;
  setRating: (rating: RatingFilter) => void;
  setFlags: (flag: FlagValue[]) => void;
  setExts: (ext: string[]) => void;
  setSize: (size: SizeFilter) => void;
  setEdited: (edited: boolean | null) => void;
  clearFilters: () => void;
  reset: () => void;
}

const initial = {
  isOpen: false,
  search: "",
  sort: { field: "name" as SortField, direction: "asc" as SortDirection },
  rating: null,
  flags: [] as FlagValue[],
  exts: [] as string[],
  size: null as SizeFilter,
  edited: null as boolean | null,
};

export const useFilterStore = create<FilterState>((set) => ({
  ...initial,
  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setSearch: (search) => set({ search }),
  setSort: (sort) => set((state) => ({ sort: { ...state.sort, ...sort } })),
  setRating: (rating) => set({ rating }),
  setFlags: (flags) => set({ flags }),
  setExts: (exts) => set({ exts }),
  setSize: (size) => set({ size }),
  setEdited: (edited) => set({ edited }),
  clearFilters: () =>
    set((state) => ({
      search: "",
      rating: null,
      flags: [],
      exts: [],
      size: null,
      edited: null,
      sort: state.sort,
      isOpen: state.isOpen,
    })),
  reset: () => set({ ...initial }),
}));
