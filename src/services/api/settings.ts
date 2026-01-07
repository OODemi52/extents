import { invokeTauri } from "./_client";

import { CacheType } from "@/types/settings";

export async function getCacheSize(cacheType: CacheType): Promise<number> {
  return invokeTauri("get_cache_size", { cacheType });
}

export async function clearCache(cacheType: CacheType): Promise<void> {
  return invokeTauri("clear_cache", { cacheType });
}
