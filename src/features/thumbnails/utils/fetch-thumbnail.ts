import { convertFileSrc } from "@tauri-apps/api/core";

import { api } from "@/services/api";

export async function fetchThumbnail(imagePath: string): Promise<string> {
  const cachePath = await api.thumbnails.get(imagePath);

  return convertFileSrc(cachePath);
}
