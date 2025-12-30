import { create } from "zustand";

import { setRating as setRatingApi } from "@/services/api/annotations";
import { RatingState, RatingValue } from "@/types/file-annotations";

const persistRating = (path: string, value: RatingValue) => {
  void setRatingApi(path, value).catch((error) => {
    console.error("[rating] persist failed", error);
  });
};

const persistRatings = (entries: Record<string, RatingValue>) => {
  Object.entries(entries).forEach(([path, value]) => {
    persistRating(path, value);
  });
};

export const useRatingStore = create<RatingState>((set, get) => ({
  ratings: {},
  setRating: (path, value) => {
    const current = get().ratings[path] ?? 0;
    const next: RatingValue = current === value ? 0 : value;

    get().setRatingValue(path, next);
  },
  setRatingValue: (path, value) => {
    set((state) => ({
      ratings: {
        ...state.ratings,
        [path]: value,
      },
    }));

    persistRating(path, value);
  },
  setRatings: (entries) =>
    set((state) => ({
      ratings: { ...state.ratings, ...entries },
    })),
  setRatingsValue: (entries) => {
    set((state) => ({
      ratings: { ...state.ratings, ...entries },
    }));

    persistRatings(entries);
  },
  applyRatingToPaths: (paths, value) => {
    if (!paths.length) {
      return;
    }

    const { ratings, setRating, setRatingsValue } = get();

    if (paths.length === 1) {
      setRating(paths[0], value);

      return;
    }

    const firstRating = ratings[paths[0]] ?? 0;
    const isUniform = paths.every(
      (path) => (ratings[path] ?? 0) === firstRating,
    );
    const nextValue: RatingValue =
      isUniform && firstRating === value ? 0 : value;
    const entries: Record<string, RatingValue> = {};

    paths.forEach((path) => {
      entries[path] = nextValue;
    });

    setRatingsValue(entries);
  },
}));
