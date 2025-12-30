import type {
  RatingEntry,
  RatingState,
  RatingValue,
} from "@/types/file-annotations";

import { create } from "zustand";

import { applyOptimisticAnnotationUpdate } from "@/features/annotate/utils/optimistic-annotations";
import { setRatings as _setRatings } from "@/services/api/annotations";

export const useRatingStore = create<RatingState>((set, get) => ({
  ratings: {},

  setRatings: (entries) =>
    applyOptimisticAnnotationUpdate<RatingEntry, RatingValue>({
      annotations: entries,
      getCurrentAnnotations: () => get().ratings,
      setAnnotations: (next) => set({ ratings: next }),
      getPath: (entry) => entry.path,
      getValue: (entry) => entry.rating,
      defaultValue: 0,
      persistFn: _setRatings,
      label: "rating",
    }),

  toggleRating: (path, value) => {
    const current = get().ratings[path] ?? 0;
    const next: RatingValue = current === value ? 0 : value;

    get().setRatings([{ path, rating: next }]);
  },

  hydrateRatings: (entries) =>
    set((state) => ({
      ratings: { ...state.ratings, ...entries },
    })),
}));
