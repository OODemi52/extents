import { create } from "zustand";

import { setRating } from "@/services/api/annotations";
import { RatingState, RatingValue } from "@/types/file-annotations";

export const useRatingStore = create<RatingState>((set) => ({
  ratings: {},
  setRating: (path, value) => {
    set((state) => {
      const current = state.ratings[path] ?? 0;
      const next: RatingValue = current === value ? 0 : value;

      void setRating(path, next).catch((error) => {
        console.error("[rating] persist failed", error);
      });

      return {
        ratings: {
          ...state.ratings,
          [path]: next,
        },
      };
    });
  },
  setRatings: (entries) =>
    set((state) => ({
      ratings: { ...state.ratings, ...entries },
    })),
}));
