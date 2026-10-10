import type { FileCollectionChange } from "@/store/image-store";

import { useEffect, useMemo, useRef } from "react";

import { useFilterStore } from "../stores/filter-store";

import { useFlagStore } from "@/features/annotate/flagging/store/use-flagging-store";
import { useRatingStore } from "@/features/annotate/rating/store/use-rating-store";
import { useImageStore } from "@/store/image-store";
import { FlagValue, RatingValue } from "@/types/file-annotations";
import { FileMetadata } from "@/types/image";
import { useImageLoader } from "@/hooks/use-image-loader";

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

type FilteredImagesInput = {
  files: FileMetadata[];
  ratings: Record<string, RatingValue>;
  flags: Record<string, FlagValue>;
  filters: FilterSnapshot;
  fileCollectionRevision?: number;
  lastFileCollectionChange?: FileCollectionChange | null;
};

type FilteredImagesCache = FilteredImagesInput & {
  result: AnnotatedImage[];
};

const EMPTY_FILES: FileMetadata[] = [];
const EMPTY_RATINGS: Record<string, RatingValue> = {};
const EMPTY_ANNOTATION_FLAGS: Record<string, FlagValue> = {};
const EMPTY_FILTER_FLAGS: FlagValue[] = [];
const EMPTY_EXTENSIONS: string[] = [];
const INACTIVE_SORT: FilterSnapshot["sort"] = {
  field: "name",
  direction: "asc",
};

let filteredImagesCache: FilteredImagesCache | null = null;
let filteredPathsCache: {
  images: readonly FileMetadata[];
  paths: string[];
} | null = null;
const fileFilterMetadataCache = new WeakMap<
  FileMetadata,
  { ext: string; searchName: string }
>();

function filtersMatch(left: FilterSnapshot, right: FilterSnapshot) {
  return (
    left.search === right.search &&
    left.rating === right.rating &&
    left.flags === right.flags &&
    left.exts === right.exts &&
    left.size === right.size &&
    left.edited === right.edited &&
    left.sort === right.sort
  );
}

function getFileFilterMetadata(file: FileMetadata) {
  const cached = fileFilterMetadataCache.get(file);

  if (cached) return cached;

  const metadata = {
    ext: file.fileName.split(".").pop()?.toLowerCase() ?? "",
    searchName: file.fileName.toLowerCase(),
  };

  fileFilterMetadataCache.set(file, metadata);

  return metadata;
}

function matchesNumericFilter(
  value: number,
  filter: { operation: "gte" | "lte" | "eq"; value: number },
) {
  if (filter.operation === "gte") return value >= filter.value;
  if (filter.operation === "lte") return value <= filter.value;

  return value === filter.value;
}

function compareImages(
  left: AnnotatedImage,
  right: AnnotatedImage,
  sort: FilterSnapshot["sort"],
) {
  const direction = sort.direction === "asc" ? 1 : -1;
  let comparison = 0;

  switch (sort.field) {
    case "name":
      comparison = left.fileName.localeCompare(right.fileName);
      break;
    case "ext":
      comparison = left.ext.localeCompare(right.ext);
      break;
    case "size":
      comparison = (left.fileSize ?? 0) - (right.fileSize ?? 0);
      break;
    case "rating":
      comparison = left.rating - right.rating;
      break;
    case "flag":
      comparison = left.flag.localeCompare(right.flag);
      break;
    case "addedAt":
      comparison = (left.addedAt ?? 0) - (right.addedAt ?? 0);
      break;
    case "modifiedAt":
      comparison = (left.modifiedAt ?? 0) - (right.modifiedAt ?? 0);
      break;
  }

  return comparison * direction;
}

function buildFilteredImages(
  files: FileMetadata[],
  ratings: Record<string, RatingValue>,
  flags: Record<string, FlagValue>,
  filters: FilterSnapshot,
): AnnotatedImage[] {
  const searchQuery = filters.search.trim().toLowerCase();
  const flagFilter = filters.flags.length > 0 ? new Set(filters.flags) : null;
  const extensionFilter =
    filters.exts.length > 0 ? new Set(filters.exts) : null;
  const rows: AnnotatedImage[] = [];

  for (const file of files) {
    const metadata = getFileFilterMetadata(file);
    const rating = ratings[file.path] ?? 0;
    const flag = flags[file.path] ?? "unflagged";

    if (searchQuery && !metadata.searchName.includes(searchQuery)) continue;
    if (
      filters.rating &&
      filters.rating.value > 0 &&
      !matchesNumericFilter(rating, filters.rating)
    ) {
      continue;
    }
    if (flagFilter && !flagFilter.has(flag)) continue;
    if (extensionFilter && !extensionFilter.has(metadata.ext)) continue;
    if (
      filters.size &&
      !matchesNumericFilter(file.fileSize ?? 0, filters.size)
    ) {
      continue;
    }
    if (filters.edited !== null && filters.edited) continue;

    rows.push({
      ...file,
      ext: metadata.ext,
      rating,
      flag,
      addedAt: undefined,
      modifiedAt: undefined,
      edited: undefined,
    });
  }

  rows.sort((left, right) => compareImages(left, right, filters.sort));

  return rows;
}

function mergeSortedImages(
  current: AnnotatedImage[],
  appended: AnnotatedImage[],
  sort: FilterSnapshot["sort"],
) {
  if (!appended.length) return current;
  if (!current.length) return appended;

  const merged = new Array<AnnotatedImage>(current.length + appended.length);
  let currentIndex = 0;
  let appendedIndex = 0;
  let mergedIndex = 0;

  while (currentIndex < current.length && appendedIndex < appended.length) {
    if (
      compareImages(current[currentIndex], appended[appendedIndex], sort) <= 0
    ) {
      merged[mergedIndex] = current[currentIndex];
      currentIndex += 1;
    } else {
      merged[mergedIndex] = appended[appendedIndex];
      appendedIndex += 1;
    }

    mergedIndex += 1;
  }

  while (currentIndex < current.length) {
    merged[mergedIndex] = current[currentIndex];
    currentIndex += 1;
    mergedIndex += 1;
  }

  while (appendedIndex < appended.length) {
    merged[mergedIndex] = appended[appendedIndex];
    appendedIndex += 1;
    mergedIndex += 1;
  }

  return merged;
}

export function getFilteredImagesFromState({
  files,
  ratings,
  flags,
  filters,
}: FilteredImagesInput): AnnotatedImage[] {
  return buildFilteredImages(files, ratings, flags, filters);
}

function extendFilteredImages(
  cached: FilteredImagesCache,
  input: FilteredImagesInput,
) {
  const change = input.lastFileCollectionChange;

  // Only reuse prior rows when the store proves this revision is its direct append successor.
  if (
    !change ||
    change.kind !== "append" ||
    change.previousRevision !== cached.fileCollectionRevision ||
    change.revision !== input.fileCollectionRevision ||
    change.startIndex !== cached.files.length ||
    change.startIndex > input.files.length ||
    cached.ratings !== input.ratings ||
    cached.flags !== input.flags ||
    !filtersMatch(cached.filters, input.filters)
  ) {
    return null;
  }

  const appended = buildFilteredImages(
    input.files.slice(change.startIndex),
    input.ratings,
    input.flags,
    input.filters,
  );

  return mergeSortedImages(cached.result, appended, input.filters.sort);
}

function getSharedFilteredImages(input: FilteredImagesInput) {
  const cached = filteredImagesCache;

  if (
    cached &&
    cached.files === input.files &&
    cached.fileCollectionRevision === input.fileCollectionRevision &&
    cached.ratings === input.ratings &&
    cached.flags === input.flags &&
    filtersMatch(cached.filters, input.filters)
  ) {
    return cached.result;
  }

  const result = cached
    ? (extendFilteredImages(cached, input) ?? getFilteredImagesFromState(input))
    : getFilteredImagesFromState(input);

  filteredImagesCache = { ...input, result };

  return result;
}

export function getFilteredImagePaths(images: readonly FileMetadata[]) {
  if (filteredPathsCache?.images === images) {
    return filteredPathsCache.paths;
  }

  const paths = images.map((file) => file.path);

  filteredPathsCache = { images, paths };

  return paths;
}

export function getFilteredPathsFromState(
  input: FilteredImagesInput,
): string[] {
  return getFilteredImagePaths(getSharedFilteredImages(input));
}

export function getFilteredPaths() {
  const { files, fileCollectionRevision, lastFileCollectionChange } =
    useImageStore.getState();
  const ratings = useRatingStore.getState().ratings;
  const flags = useFlagStore.getState().flags;
  const filterState = useFilterStore.getState();

  return getFilteredPathsFromState({
    files: files,
    fileCollectionRevision,
    lastFileCollectionChange,
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
  const files = useImageStore((state) => state.files);
  const fileCollectionRevision = useImageStore(
    (state) => state.fileCollectionRevision,
  );
  const lastFileCollectionChange = useImageStore(
    (state) => state.lastFileCollectionChange,
  );
  const ratings = useRatingStore((state) => state.ratings);
  const flags = useFlagStore((state) => state.flags);
  const search = useFilterStore((state) => state.search);
  const rating = useFilterStore((state) => state.rating);
  const flagFilter = useFilterStore((state) => state.flags);
  const exts = useFilterStore((state) => state.exts);
  const size = useFilterStore((state) => state.size);
  const edited = useFilterStore((state) => state.edited);
  const sort = useFilterStore((state) => state.sort);

  return useMemo(
    () =>
      getFilteredPathsFromState({
        files: files,
        fileCollectionRevision,
        lastFileCollectionChange,
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
      files,
      fileCollectionRevision,
      lastFileCollectionChange,
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

export function useFilteredImages(active = true) {
  const files = useImageStore((state) => (active ? state.files : EMPTY_FILES));
  const fileCollectionRevision = useImageStore((state) =>
    active ? state.fileCollectionRevision : 0,
  );
  const lastFileCollectionChange = useImageStore((state) =>
    active ? state.lastFileCollectionChange : null,
  );
  const ratings = useRatingStore((state) =>
    active ? state.ratings : EMPTY_RATINGS,
  );
  const flags = useFlagStore((state) =>
    active ? state.flags : EMPTY_ANNOTATION_FLAGS,
  );
  const search = useFilterStore((state) => (active ? state.search : ""));
  const rating = useFilterStore((state) => (active ? state.rating : null));
  const flagFilter = useFilterStore((state) =>
    active ? state.flags : EMPTY_FILTER_FLAGS,
  );
  const exts = useFilterStore((state) =>
    active ? state.exts : EMPTY_EXTENSIONS,
  );
  const size = useFilterStore((state) => (active ? state.size : null));
  const edited = useFilterStore((state) => (active ? state.edited : null));
  const sort = useFilterStore((state) => (active ? state.sort : INACTIVE_SORT));
  const retainedResultRef = useRef<AnnotatedImage[]>([]);

  const filtered = useMemo(() => {
    if (!active) {
      return retainedResultRef.current;
    }

    return getSharedFilteredImages({
      files,
      fileCollectionRevision,
      lastFileCollectionChange,
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
    });
  }, [
    active,
    files,
    fileCollectionRevision,
    lastFileCollectionChange,
    ratings,
    flags,
    search,
    rating,
    flagFilter,
    exts,
    size,
    edited,
    sort,
  ]);

  if (active) {
    retainedResultRef.current = filtered;
  }

  return filtered;
}

export function useFilteredSelectionSync() {
  const files = useImageStore((state) => state.files);
  const selectedIndex = useImageStore((state) => state.selectedIndex);
  const isLoading = useImageStore((state) => state.isLoading);
  const { handleSelectImageByPath } = useImageLoader();
  const filtered = useFilteredImages();

  useEffect(() => {
    if (!filtered.length || selectedIndex === null || isLoading) return;

    const currentPath = files[selectedIndex]?.path ?? null;

    if (!currentPath) return;

    const hasSelected =
      currentPath && filtered.some((file) => file.path === currentPath);

    if (!hasSelected) {
      handleSelectImageByPath(filtered[0].path);
    }
  }, [filtered, selectedIndex, files, handleSelectImageByPath, isLoading]);
}
