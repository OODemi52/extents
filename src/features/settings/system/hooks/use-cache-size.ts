import { useEffect } from "react";

import { useCacheStore } from "../stores/cache-store";

import { api } from "@/services/api";
import { CacheType } from "@/types/settings";

export function useCacheSize() {
  const setCacheSize = useCacheStore((state) => state.setCacheSize);

  useEffect(() => {
    const getCacheSize = async () => {
      try {
        const size = await api.settings.getCacheSize(CacheType.All);

        setCacheSize(size);
      } catch (error) {
        console.error("Failed to fetch cache size", error);
      }
    };

    getCacheSize();
  }, [setCacheSize]);
}
