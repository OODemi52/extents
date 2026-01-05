import { useEffect, useMemo } from "react";

import { api } from "@/services/api";
import { useImageStore } from "@/store/image-store";
import { useExifStore } from "@/store/exif-store";

export function useExifMetadata() {
  const files = useImageStore((state) => state.files);
  const isLoading = useImageStore((state) => state.isLoading);
  const setEntries = useExifStore((state) => state.setEntries);
  const clearEntries = useExifStore((state) => state.clearEntries);
  const paths = useMemo(() => files.map((file) => file.path), [files]);
  const dependencyKey = useMemo(() => paths.join("|"), [paths]);

  useEffect(() => {
    if (paths.length === 0 || isLoading) {
      if (!isLoading) {
        clearEntries();
      }

      return;
    }

    let cancelled = false;

    api.exif
      .getExifMetadata(paths)
      .then((rows) => {
        if (cancelled) return;
        setEntries(rows);
      })
      .catch((error) => {
        console.error("[exif] hydrate failed", error);
      });

    return () => {
      cancelled = true;
    };
  }, [dependencyKey, isLoading, paths, setEntries, clearEntries]);
}
