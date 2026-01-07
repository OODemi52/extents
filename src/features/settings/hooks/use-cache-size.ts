import { useEffect } from "react";

import { api } from "@/services/api";
import { useSettingsStore } from "@/features/settings/store/settings-store";
import { CacheType } from "@/types/settings";

export function useCacheSize() {
  const setCacheSize = useSettingsStore((state) => state.setCacheSize);

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
