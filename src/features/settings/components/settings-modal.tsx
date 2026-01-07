import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { useState } from "react";
import { Spinner } from "@heroui/react";

import { useSettingsStore } from "@/features/settings/store/settings-store";
import { api } from "@/services/api";
import { CacheType } from "@/types/settings";
import { formatBytes } from "@/lib/formatters";

export function SettingsModal() {
  const { isSettingsModalOpen, closeSettingsModal, cacheSize, setCacheSize } =
    useSettingsStore();
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
    <Modal
      isOpen={isSettingsModalOpen}
      placement="center"
      onOpenChange={closeSettingsModal}
    >
      <ModalContent>
        <ModalHeader className="text-lg font-bold">Settings</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <h3 className="text-md font-semibold">Cache Management</h3>
            <div className="flex items-center justify-between gap-4 p-3 bg-zinc-800 rounded-lg">
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
              <Button disabled={isLoading} size="sm" onPress={getCacheSize}>
                Refresh
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs text-zinc-500">
                Clearing the cache will remove generated thumbnails and
                previews. They will be regenerated on demand.
              </p>
              <div className="flex gap-2">
                <Button
                  color="danger"
                  size="sm"
                  variant="flat"
                  onPress={() => clearCache(CacheType.Thumbnail)}
                >
                  Clear Thumbnail Cache
                </Button>
                <Button
                  color="danger"
                  size="sm"
                  variant="flat"
                  onPress={() => clearCache(CacheType.Preview)}
                >
                  Clear Preview Cache
                </Button>
                <Button
                  color="danger"
                  size="sm"
                  variant="solid"
                  onPress={() => clearCache(CacheType.All)}
                >
                  Clear All Caches
                </Button>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onPress={closeSettingsModal}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
