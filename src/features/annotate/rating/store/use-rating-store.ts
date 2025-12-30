import { create } from "zustand";

import { setRatings as _setRatings } from "@/services/api/annotations";
import { RatingState, RatingValue } from "@/types/file-annotations";

export const useRatingStore = create<RatingState>((set, get) => ({
  ratings: {},

  setRatings: (entries) => {
    if (!entries.length) {
      return;
    }

    const previousRatings = entries.reduce<Record<string, RatingValue>>(
      (accumulator, entry) => {
        accumulator[entry.path] = get().ratings[entry.path] ?? 0;

        return accumulator;
      },
      {},
    );

    set((state) => {
      const nextRatings = { ...state.ratings };

      entries.forEach(({ path, rating }) => {
        nextRatings[path] = rating;
      });

      return { ratings: nextRatings };
    });

    void _setRatings(entries).catch((error) => {
      console.error("[rating] persist failed", error);
      set((state) => ({
        ratings: { ...state.ratings, ...previousRatings },
      }));
    });
  },

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
