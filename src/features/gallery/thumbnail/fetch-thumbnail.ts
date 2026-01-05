import { convertFileSrc } from "@tauri-apps/api/core";

import { api } from "@/services/api";

export type ThumbnailPayload = {
  path: string;
  src: string;
};

export async function fetchThumbnail(
  imagePath: string,
): Promise<ThumbnailPayload> {
  const path = await api.thumbnails.get(imagePath);

  return {
    path,
    src: convertFileSrc(path),
  };
}
