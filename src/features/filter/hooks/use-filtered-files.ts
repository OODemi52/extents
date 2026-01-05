import { useMemo } from "react";
import { useEffect, useRef } from "react";

import { useFilterStore } from "../stores/filter-store";

import { useFlagStore } from "@/features/annotate/flagging/store/use-flagging-store";
import { useRatingStore } from "@/features/annotate/rating/store/use-rating-store";
import { useImageStore } from "@/store/image-store";
import { FlagValue, RatingValue } from "@/types/file-annotations";
import { FileMetadata } from "@/types/image";
import { useImageLoader } from "@/hooks/use-image-loader";
import { clearRenderer } from "@/services/api/renderer";

type FilterSnapshot = Pick<
  ReturnType<typeof useFilterStore.getState>,
  "search" | "rating" | "flags" | "exts" | "size" | "edited" | "sort"
>;

type AnnotatedImage = FileMetadata & {
  ext: string;
  rating: RatingValue;
  flag: FlagValue;
  addedAt?: number;
  modifiedAt?: number;
  edited?: boolean;
};

function buildAnnotatedImages(
  files: FileMetadata[],
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

export function getFilteredImagesFromState({
  files,
  ratings,
  flags,
  filters,
}: {
  files: FileMetadata[];
  ratings: Record<string, RatingValue>;
  flags: Record<string, FlagValue>;
  filters: FilterSnapshot;
}): AnnotatedImage[] {
  const annotated = buildAnnotatedImages(files, ratings, flags);
  const {
    search,
    rating,
    flags: flagFilter,
    exts,
    size,
    edited,
    sort,
  } = filters;

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
}

export function getFilteredPathsFromState({
  files,
  ratings,
  flags,
  filters,
}: {
  files: FileMetadata[];
  ratings: Record<string, RatingValue>;
  flags: Record<string, FlagValue>;
  filters: FilterSnapshot;
}): string[] {
  return getFilteredImagesFromState({
    files,
    ratings,
    flags,
    filters,
  }).map((file) => file.path);
}

export function getFilteredPaths() {
  const { fileMetadataList } = useImageStore.getState();
  const ratings = useRatingStore.getState().ratings;
  const flags = useFlagStore.getState().flags;
  const filterState = useFilterStore.getState();

  return getFilteredPathsFromState({
    files: fileMetadataList,
    ratings,
    flags,
    filters: {
      search: filterState.search,
      rating: filterState.rating,
      flags: filterState.flags,
      exts: filterState.exts,
      size: filterState.size,
      edited: filterState.edited,
      sort: filterState.sort,
    },
  });
}

export function useFilteredPaths() {
  const { fileMetadataList } = useImageStore();
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

  return useMemo(
    () =>
      getFilteredImagesFromState({
        files: fileMetadataList,
        ratings,
        flags,
        filters: {
          search,
          rating,
          flags: flagFilter,
          exts,
          size,
          edited,
          sort,
        },
      }).map((file) => file.path),
    [
      fileMetadataList,
      ratings,
      flags,
      search,
      rating,
      flagFilter,
      exts,
      size,
      edited,
      sort,
    ],
  );
}

export function useFilteredImages() {
  const { fileMetadataList, selectedIndex, isLoading } = useImageStore();
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

  const filtered = useMemo(
    () =>
      getFilteredImagesFromState({
        files: fileMetadataList,
        ratings,
        flags,
        filters: {
          search,
          rating,
          flags: flagFilter,
          exts,
          size,
          edited,
          sort,
        },
      }),
    [
      fileMetadataList,
      ratings,
      flags,
      search,
      rating,
      flagFilter,
      exts,
      size,
      edited,
      sort,
    ],
  );
  const autoSelectedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!filtered.length) {
      void clearRenderer();
      autoSelectedPathRef.current = null;

      return;
    }

    const currentPath =
      selectedIndex !== null
        ? (fileMetadataList[selectedIndex]?.path ?? null)
        : null;

    if (
      currentPath &&
      autoSelectedPathRef.current &&
      currentPath !== autoSelectedPathRef.current
    ) {
      autoSelectedPathRef.current = null;
    }

    const hasSelected =
      currentPath && filtered.some((file) => file.path === currentPath);

    if (!hasSelected) {
      handleSelectImageByPath(filtered[0].path);
      autoSelectedPathRef.current = filtered[0].path;

      return;
    }

    if (!isLoading && autoSelectedPathRef.current === currentPath) {
      const firstPath = filtered[0].path;

      if (currentPath !== firstPath) {
        handleSelectImageByPath(firstPath);
        autoSelectedPathRef.current = firstPath;
      }
    }
  }, [
    filtered,
    selectedIndex,
    fileMetadataList,
    handleSelectImageByPath,
    isLoading,
  ]);

  return filtered;
}
