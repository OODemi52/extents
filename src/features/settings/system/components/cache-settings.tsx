import { Button } from "@heroui/button";
import { Spinner } from "@heroui/react";
import { useState } from "react";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr";

import { useCacheStore } from "../stores/cache-store";

import { formatBytes } from "@/lib/formatters";
import { api } from "@/services/api";
import { CacheType } from "@/types/settings";

export function CacheSettings() {
  const { cacheSize, setCacheSize } = useCacheStore();
  const [isLoading, setIsLoading] = useState(false);

  const getCacheSize = async () => {
    setIsLoading(true);
    try {
      const size = await api.settings.getCacheSize(CacheType.All);

      setCacheSize(size);
    } catch (error) {
      console.error("Failed to get cache size", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = async (cacheType: CacheType) => {
    try {
      await api.settings.clearCache(cacheType);
      await getCacheSize();
    } catch (error) {
      console.error("Failed to clear cache", error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-md font-semibold">Cache Management</h3>
      <div className="flex items-center justify-between gap-4 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Total Cache Size:</span>
          {isLoading ? (
            <Spinner size="sm" />
          ) : (
            <span className="font-mono text-sm font-semibold">
              {formatBytes(cacheSize ?? 0)}
            </span>
          )}
        </div>

        <Button
          disableRipple
          isIconOnly
          className="min-w-8 bg-transparent hover:bg-zinc-700"
          isDisabled={isLoading}
          size="sm"
          onPress={getCacheSize}
        >
          <ArrowsClockwiseIcon
            className={[
              "transition-colors",
              isLoading ? "animate-spin text-zinc-700" : "text-zinc-300",
            ].join(" ")}
            size={16}
          />
        </Button>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          color="danger"
          size="sm"
          variant="solid"
          onPress={() => clearCache(CacheType.All)}
        >
          Clear Cache
        </Button>
      </div>
      <p className="text-danger-500 text-xs flex justify-end">
        This will delete the in app cache permenantly. Images may take longer to
        load.
      </p>
    </div>
  );
}
