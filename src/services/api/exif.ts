import { invokeTauri } from "./_client";

import { ImageExifEntry } from "@/types/exif";

export async function getExifMetadata(
  paths: string[],
): Promise<ImageExifEntry[]> {
  return invokeTauri("get_exif_metadata", { paths });
}
