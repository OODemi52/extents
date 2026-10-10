import { useEffect, useMemo } from "react";

import { api } from "@/services/api";
import { useFlagStore } from "@/features/annotate/flagging/store/use-flagging-store";
import { useRatingStore } from "@/features/annotate/rating/store/use-rating-store";
import { useImageStore } from "@/store/image-store";

const EMPTY_FILES: ReturnType<typeof useImageStore.getState>["files"] = [];

export function useAnnotations() {
  const files = useImageStore((state) =>
    state.isLoading ? EMPTY_FILES : state.files,
  );
  const isLoading = useImageStore((state) => state.isLoading);
  const paths = useMemo(() => files.map((file) => file.path), [files]);
  const dependencyKey = useMemo(() => paths.join("|"), [paths]);

  useEffect(() => {
    if (paths.length === 0 || isLoading) return;

    let cancelled = false;

    api.annotations
      .getAnnotations({ paths })
      .then((rows) => {
        if (cancelled) return;
        const flags: Record<string, any> = {};
        const ratings: Record<string, any> = {};

        rows.forEach((row) => {
          flags[row.file_path] = row.flag;
          ratings[row.file_path] = row.rating;
        });

        useFlagStore.getState().hydrateFlags(flags);
        useRatingStore.getState().hydrateRatings(ratings);
      })
      .catch((err) => {
        console.error("[metadata] hydrate failed", err);
      });

    return () => {
      cancelled = true;
    };
  }, [dependencyKey, isLoading, paths]);
}
