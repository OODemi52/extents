import { useEffect, useMemo } from "react";

import { useFlagStore } from "@/features/annotate/flagging/store/use-flagging-store";
import { useRatingStore } from "@/features/annotate/rating/store/use-rating-store";
import { useImageStore } from "@/store/image-store";
import { getAnnotations } from "@/services/api/annotations";

export function useAnnotations() {
  const files = useImageStore((selected) => selected.fileMetadataList);
  const isLoading = useImageStore((selected) => selected.isLoading);
  const paths = useMemo(() => files.map((file) => file.path), [files]);
  const dependencyKey = useMemo(() => paths.join("|"), [paths]);

  useEffect(() => {
    if (paths.length === 0 || isLoading) return;

    let cancelled = false;

    getAnnotations(paths)
      .then((rows) => {
        if (cancelled) return;
        const flags: Record<string, any> = {};
        const ratings: Record<string, any> = {};

        rows.forEach((row) => {
          flags[row.file_path] = row.flag;
          ratings[row.file_path] = row.rating;
        });

        useFlagStore.getState().setFlags(flags);
        useRatingStore.getState().setRatings(ratings);
      })
      .catch((err) => {
        console.error("[metadata] hydrate failed", err);
      });

    return () => {
      cancelled = true;
    };
  }, [dependencyKey, paths]);
}
