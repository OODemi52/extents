import { invokeTauri } from "./_client";

import {
  FileAnnotation,
  FlagValue,
  RatingValue,
} from "@/types/file-annotations";

export async function setRating(path: string, rating: RatingValue) {
  return invokeTauri("set_rating", { path, rating });
}

export async function setFlag(path: string, flag: FlagValue) {
  return invokeTauri("set_flag", { path, flag });
}

export async function getAnnotations(
  paths: string[],
): Promise<FileAnnotation[]> {
  return invokeTauri("get_annotations", { paths });
}
