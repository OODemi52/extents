import { Button, Modal } from "@heroui/react";
import { useState } from "react";
import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  TrashSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useQueryClient } from "@tanstack/react-query";

import { useCacheStore } from "../stores/cache-store";

import { formatBytes } from "@/lib/formatters";
import { api } from "@/services/api";
import { CacheType } from "@/types/settings";

type CacheOperation = "refresh" | "clear" | null;

type CacheFeedback = {
  tone: "success" | "error";
  message: string;
};

export function CacheSettings() {
  const cacheSize = useCacheStore((state) => state.cacheSize);
  const setCacheSize = useCacheStore((state) => state.setCacheSize);
  const queryClient = useQueryClient();
  const [operation, setOperation] = useState<CacheOperation>(null);
  const [feedback, setFeedback] = useState<CacheFeedback | null>(null);
  const [isClearConfirmationOpen, setIsClearConfirmationOpen] = useState(false);

  const isRefreshing = operation === "refresh";
  const isClearing = operation === "clear";

  const getCacheSize = async () => {
    setOperation("refresh");
    setFeedback(null);

    try {
      const size = await api.settings.getCacheSize({
        cacheType: CacheType.All,
      });

      setCacheSize(size);
      setFeedback({ tone: "success", message: "Cache size updated." });
    } catch {
      setFeedback({
        tone: "error",
        message: "Cache size could not be refreshed. Try again.",
      });
    } finally {
      setOperation(null);
    }
  };

  const clearCache = async (cacheType: CacheType) => {
    setOperation("clear");
    setFeedback(null);

    try {
      try {
        await api.settings.clearCache({ cacheType });
      } catch {
        setFeedback({
          tone: "error",
          message: "The cache could not be cleared. Try again.",
        });

        return;
      }

      setCacheSize(0);
      setIsClearConfirmationOpen(false);

      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["thumbnail"] }),
          queryClient.invalidateQueries({ queryKey: ["image-preview"] }),
        ]);

        const size = await api.settings.getCacheSize({
          cacheType: CacheType.All,
        });

        setCacheSize(size);
        setFeedback({
          tone: "success",
          message: "Cache cleared successfully.",
        });
      } catch {
        setFeedback({
          tone: "error",
          message: "Cache cleared, but the interface could not be refreshed.",
        });
      }
    } finally {
      setOperation(null);
    }
  };

  return (
    <>
      <section aria-labelledby="cache-settings-heading" className="max-w-2xl">
        <header className="pb-5">
          <h2
            className="text-lg font-semibold text-zinc-100"
            id="cache-settings-heading"
          >
            Cache
          </h2>
          <p className="mt-1 text-sm leading-5 text-zinc-500">
            Manage generated previews and thumbnails stored on this device.
          </p>
        </header>

        <div className="border-y border-white/[0.055]">
          <div className="flex min-h-20 items-center justify-between gap-6 py-4">
            <div className="min-w-0">
              <div className="text-sm font-medium text-zinc-200">
                Storage used
              </div>
              <div
                aria-busy={isRefreshing}
                className="mt-1 font-mono text-sm tabular-nums text-zinc-400"
              >
                {cacheSize == null ? "Not calculated" : formatBytes(cacheSize)}
              </div>
            </div>

            <Button
              isIconOnly
              aria-label={
                isRefreshing ? "Refreshing cache size" : "Refresh cache size"
              }
              className="h-8 min-w-8 rounded-xl border border-zinc-700/50 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              isDisabled={operation !== null}
              isPending={isRefreshing}
              size="sm"
              variant="secondary"
              onPress={getCacheSize}
            >
              <ArrowsClockwiseIcon aria-hidden="true" size={16} />
            </Button>
          </div>

          <div className="flex min-h-24 items-center justify-between gap-6 border-t border-white/[0.055] py-4">
            <div className="min-w-0">
              <div className="text-sm font-medium text-zinc-200">
                Clear cached files
              </div>
              <p className="mt-1 max-w-md text-xs leading-5 text-zinc-500">
                Remove generated previews and thumbnails. Original photos and
                edit sidecars are not affected.
              </p>
            </div>

            <Button
              className="shrink-0 rounded-xl font-medium"
              isDisabled={operation !== null}
              size="sm"
              variant="danger-soft"
              onPress={() => {
                setFeedback(null);
                setIsClearConfirmationOpen(true);
              }}
            >
              <TrashSimpleIcon aria-hidden="true" size={15} />
              Clear cache
            </Button>
          </div>
        </div>

        <div aria-live="polite" className="min-h-10 pt-3">
          {feedback ? (
            <p
              className={
                feedback.tone === "success"
                  ? "flex items-center gap-2 text-xs text-emerald-400"
                  : "flex items-center gap-2 text-xs text-red-400"
              }
              role={feedback.tone === "error" ? "alert" : "status"}
            >
              {feedback.tone === "success" ? (
                <CheckCircleIcon aria-hidden="true" size={15} />
              ) : (
                <WarningCircleIcon aria-hidden="true" size={15} />
              )}
              {feedback.message}
            </p>
          ) : null}
        </div>
      </section>

      <Modal
        isOpen={isClearConfirmationOpen}
        onOpenChange={(isOpen) => {
          if (!isClearing) {
            setIsClearConfirmationOpen(isOpen);
          }
        }}
      >
        <Modal.Backdrop
          isDismissable={!isClearing}
          isKeyboardDismissDisabled={isClearing}
          variant="blur"
        >
          <Modal.Container placement="center" size="sm">
            <Modal.Dialog className="overflow-hidden rounded-[16px] border border-zinc-700/50 bg-zinc-950 text-zinc-100 shadow-2xl">
              <Modal.Header className="border-b border-white/[0.055] px-5 py-4 text-base font-semibold">
                <Modal.Heading>Clear all cache?</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="gap-3 px-5 py-5">
                <p className="text-sm leading-6 text-zinc-300">
                  This removes{" "}
                  {cacheSize != null
                    ? `${formatBytes(cacheSize)} of generated previews and thumbnails.`
                    : "all generated previews and thumbnails."}{" "}
                  Original photos and edit sidecars will not be changed.
                </p>
                <p className="text-xs leading-5 text-zinc-500">
                  Previews may take longer to appear while the cache is rebuilt.
                </p>
                {feedback?.tone === "error" ? (
                  <p
                    className="flex items-center gap-2 text-xs text-red-400"
                    role="alert"
                  >
                    <WarningCircleIcon aria-hidden="true" size={15} />
                    {feedback.message}
                  </p>
                ) : null}
              </Modal.Body>
              <Modal.Footer className="border-t border-white/[0.055] px-5 py-3">
                <Button
                  className="rounded-xl"
                  isDisabled={isClearing}
                  size="sm"
                  variant="secondary"
                  onPress={() => setIsClearConfirmationOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-xl"
                  isPending={isClearing}
                  size="sm"
                  variant="danger"
                  onPress={() => clearCache(CacheType.All)}
                >
                  Clear all cache
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
