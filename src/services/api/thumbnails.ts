import { invokeTauri } from "./_client";

export const get = async (path: string): Promise<string> => {
  return invokeTauri("get_thumbnail", { path });
};

export const prefetch = (paths: string[]): Promise<void> => {
  return invokeTauri("prefetch_thumbnails", { paths });
};
