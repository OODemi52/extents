import { create } from "zustand";

export type RatingValue = 0 | 1 | 2 | 3 | 4 | 5;

type RatingState = {
  ratings: Record<string, RatingValue>;
  setRating: (path: string, value: RatingValue) => void;
};

export const useRatingStore = create<RatingState>((set) => ({
  ratings: {},
  setRating: (path, value) =>
    set((state) => ({
      ratings: {
        ...state.ratings,
        [path]: state.ratings[path] === value ? 0 : value,
      },
    })),
}));
