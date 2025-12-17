import { useMemo } from "react";
import { useEffect } from "react";

import { useFilterStore } from "../stores/filter-store";

import { useFlagStore } from "@/features/annotate/flagging/store/use-flagging-store";
import { useRatingStore } from "@/features/annotate/rating/store/use-rating-store";
import { useImageStore } from "@/store/image-store";
import { FlagValue, RatingValue } from "@/types/file-annotations";
import { ImageMetadata } from "@/types/image";
import { useImageLoader } from "@/hooks/use-image-loader";
import { clearRenderer } from "@/services/api/renderer";

type AnnotatedImage = ImageMetadata & {
  ext: string;
  rating: RatingValue;
  flag: FlagValue;
  addedAt?: number;
  modifiedAt?: number;
  edited?: boolean;
};

function buildAnnotatedImages(
  files: ImageMetadata[],
  ratings: Record<string, RatingValue>,
  flags: Record<string, FlagValue>,
): AnnotatedImage[] {
  return files.map((file) => ({
    ...file,
    ext: file.fileName.split(".").pop()?.toLowerCase() ?? "",
    rating: ratings[file.path] ?? 0,
    flag: flags[file.path] ?? "unflagged",
    addedAt: undefined,
    modifiedAt: undefined,
    edited: undefined,
  }));
}

export function useFilteredImages() {
  const { fileMetadataList, selectedIndex } = useImageStore();
  const { handleSelectImageByPath } = useImageLoader();
  const ratings = useRatingStore((state) => state.ratings);
  const flags = useFlagStore((state) => state.flags);
  const {
    search,
    rating,
    flags: flagFilter,
    exts,
    size,
    edited,
    sort,
  } = useFilterStore();

  const annotated = useMemo(
    () => buildAnnotatedImages(fileMetadataList, ratings, flags),
    [fileMetadataList, ratings, flags],
  );

  const filtered = useMemo(() => {
    let rows = [...annotated];

    if (search.trim()) {
      const searchQuery = search.trim().toLowerCase();

      rows = rows.filter((row) =>
        row.fileName.toLowerCase().includes(searchQuery),
      );
    }
    if (rating && rating.value > 0) {
      rows = rows.filter((row) => {
        const ratingValue = row.rating ?? 0;

        if (rating.operation === "gte") return ratingValue >= rating.value;
        if (rating.operation === "lte") return ratingValue <= rating.value;

        return ratingValue === rating.value;
      });
    }
    if (flagFilter.length) {
      rows = rows.filter((row) => flagFilter.includes(row.flag));
    }
    if (exts.length) {
      rows = rows.filter((row) => exts.includes(row.ext));
    }
    if (size) {
      rows = rows.filter((row) => {
        const s = row.fileSize ?? 0;

        if (size.operation === "gte") return s >= size.value;
        if (size.operation === "lte") return s <= size.value;

        return s === size.value;
      });
    }
    if (edited !== null) {
      rows = rows.filter((row) => !!row.edited === edited);
    }

    rows.sort((a, b) => {
      const dir = sort.direction === "asc" ? 1 : -1;

      switch (sort.field) {
        case "name":
          return a.fileName.localeCompare(b.fileName) * dir;
        case "ext":
          return (a.ext || "").localeCompare(b.ext || "") * dir;
        case "size":
          return ((a.fileSize ?? 0) - (b.fileSize ?? 0)) * dir;
        case "rating":
          return ((a.rating ?? 0) - (b.rating ?? 0)) * dir;
        case "flag":
          return (a.flag || "").localeCompare(b.flag || "") * dir;
        case "addedAt":
          return ((a.addedAt ?? 0) - (b.addedAt ?? 0)) * dir;
        case "modifiedAt":
          return ((a.modifiedAt ?? 0) - (b.modifiedAt ?? 0)) * dir;
        default:
          return 0;
      }
    });

    return rows;
  }, [annotated, search, rating, flagFilter, exts, size, edited, sort]);

  useEffect(() => {
    if (!filtered.length) {
      void clearRenderer();

      return;
    }

    const currentPath =
      selectedIndex !== null
        ? (fileMetadataList[selectedIndex]?.path ?? null)
        : null;

    const hasSelected =
      currentPath && filtered.some((file) => file.path === currentPath);

    if (!hasSelected) {
      handleSelectImageByPath(filtered[0].path);
    }
  }, [filtered, selectedIndex, fileMetadataList, handleSelectImageByPath]);

  return filtered;
}
