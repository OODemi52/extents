import { invokeTauri } from "./_client";

import {
  FileAnnotation,
  FlagEntry,
  RatingEntry,
} from "@/types/file-annotations";

export async function setRatings(entries: RatingEntry[]) {
  return invokeTauri("set_ratings", { entries });
}

export async function setFlags(entries: FlagEntry[]) {
  return invokeTauri("set_flags", { entries });
}

export async function getAnnotations(
  paths: string[],
): Promise<FileAnnotation[]> {
  return invokeTauri("get_annotations", { paths });
}
