import { invokeTauri } from "./_client";

import {
  FileAnnotation,
  FlagValue,
  RatingEntry,
} from "@/types/file-annotations";

export async function setRatings(entries: RatingEntry[]) {
  return invokeTauri("set_ratings", { entries });
}

export async function setFlag(path: string, flag: FlagValue) {
  return invokeTauri("set_flag", { path, flag });
}

export async function getAnnotations(
  paths: string[],
): Promise<FileAnnotation[]> {
  return invokeTauri("get_annotations", { paths });
}
