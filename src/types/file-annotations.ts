export type RatingValue = 0 | 1 | 2 | 3 | 4 | 5;
export type FlagValue = "unflagged" | "flagged" | "rejected";

export type RatingState = {
  ratings: Record<string, RatingValue>;
  setRating: (path: string, value: RatingValue) => void;
  setRatings: (entries: Record<string, RatingValue>) => void;
};

export type FlagState = {
  flags: Record<string, FlagValue>;
  setFlag: (path: string, state: FlagValue) => void;
  setFlags: (entries: Record<string, FlagValue>) => void;
};

export type FileAnnotation = {
  file_path: string;
  rating: RatingValue;
  flag: FlagValue;
};
