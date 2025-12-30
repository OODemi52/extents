export type RatingValue = 0 | 1 | 2 | 3 | 4 | 5;
export type FlagValue = "unflagged" | "picked" | "rejected";

export type AnnotationEntry<TValue> = {
  path: string;
  value: TValue;
};

export type RatingEntry = AnnotationEntry<RatingValue>;

export type FlagEntry = AnnotationEntry<FlagValue>;

export type RatingState = {
  ratings: Record<string, RatingValue>;
  setRatings: (entries: RatingEntry[]) => void;
  toggleRating: (path: string, value: RatingValue) => void;
  hydrateRatings: (entries: Record<string, RatingValue>) => void;
};

export type FlagState = {
  flags: Record<string, FlagValue>;
  setFlags: (entries: FlagEntry[]) => void;
  hydrateFlags: (entries: Record<string, FlagValue>) => void;
};

export type FileAnnotation = {
  file_path: string;
  rating: RatingValue;
  flag: FlagValue;
};
