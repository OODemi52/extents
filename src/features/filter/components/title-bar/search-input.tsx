import type { ReactElement } from "react";

import { useMemo, useState } from "react";
import { Button, InputGroup } from "@heroui/react";
import {
  FlagIcon,
  FolderSimpleIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  ScalesIcon,
  StarIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";

import { useFilterStore } from "../../stores/filter-store";

import { FilterChip } from "./filter-chip";

import { useImageStore } from "@/store/image-store";
import { FlagValue } from "@/types/file-annotations";

type Chip = {
  key: string;
  label: string;
  icon: ReactElement;
  onClear?: () => void;
};

function formatRatingLabel(operation: "gte" | "lte" | "eq", value: number) {
  if (value <= 0) return "Any rating";
  const op = operation === "gte" ? "≥" : operation === "lte" ? "≤" : "=";

  return `${op} ${value}★`;
}

function formatFlags(flags: FlagValue[]) {
  if (!flags.length) return "";

  return flags
    .map((flag) => {
      if (flag === "picked") return "Picked";
      if (flag === "rejected") return "Rejected";

      return "Unflagged";
    })
    .join(", ");
}

export function FilterSearchInput() {
  const [isFocused, setIsFocused] = useState(false);
  const search = useFilterStore((state) => state.search);
  const setSearch = useFilterStore((state) => state.setSearch);
  const rating = useFilterStore((state) => state.rating);
  const setRating = useFilterStore((state) => state.setRating);
  const flags = useFilterStore((state) => state.flags);
  const setFlags = useFilterStore((state) => state.setFlags);
  const edited = useFilterStore((state) => state.edited);
  const setEdited = useFilterStore((state) => state.setEdited);
  const size = useFilterStore((state) => state.size);
  const setSize = useFilterStore((state) => state.setSize);
  const exts = useFilterStore((state) => state.exts);
  const setExts = useFilterStore((state) => state.setExts);
  const clearFilters = useFilterStore((state) => state.clearFilters);

  const currentFolderPath = useImageStore((state) => state.currentFolderPath);
  const currentFolder =
    currentFolderPath?.split(/[\\/]/).filter(Boolean).pop() ?? null;

  const hasActiveFilters =
    (rating && rating.value > 0) ||
    flags.length > 0 ||
    size !== null ||
    exts.length > 0 ||
    edited !== null;
  const showClear = hasActiveFilters || Boolean(search);

  const chips: Chip[] = useMemo(() => {
    const list: Chip[] = [];

    if (hasActiveFilters && currentFolder) {
      list.push({
        key: "folder",
        label: currentFolder,
        icon: <FolderSimpleIcon size={14} weight="duotone" />,
      });
    } else if (!hasActiveFilters && isFocused && currentFolder) {
      list.push({
        key: "folder",
        label: currentFolder,
        icon: <FolderSimpleIcon size={14} weight="duotone" />,
      });
    }

    if (rating && rating.value > 0) {
      list.push({
        key: "rating",
        label: formatRatingLabel(rating.operation, rating.value),
        icon: <StarIcon size={14} weight="duotone" />,
        onClear: () => setRating(null),
      });
    }

    if (flags.length > 0) {
      list.push({
        key: "flags",
        label: formatFlags(flags),
        icon: <FlagIcon size={14} weight="duotone" />,
        onClear: () => setFlags([]),
      });
    }

    if (size) {
      const op =
        size.operation === "gte" ? "≥" : size.operation === "lte" ? "≤" : "=";

      list.push({
        key: "size",
        label: `${op} ${size.value}`,
        icon: <ScalesIcon size={14} weight="duotone" />,
        onClear: () => setSize(null),
      });
    }

    if (exts.length > 0) {
      list.push({
        key: "exts",
        label: exts.join(", "),
        icon: <PencilSimpleIcon size={14} weight="duotone" />,
        onClear: () => setExts([]),
      });
    }

    if (edited !== null) {
      list.push({
        key: "edited",
        label: edited ? "Yes" : "No",
        icon: <PencilSimpleIcon size={14} weight="duotone" />,
        onClear: () => setEdited(null),
      });
    }

    return list;
  }, [
    hasActiveFilters,
    currentFolder,
    rating,
    setRating,
    flags,
    setFlags,
    size,
    setSize,
    exts,
    setExts,
    edited,
    setEdited,
    isFocused,
  ]);

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const visibleChips = chips.slice(0, 2);
  const hiddenChipCount = Math.max(0, chips.length - visibleChips.length);

  return (
    <InputGroup
      className="editor-control-surface h-10 min-h-10 min-w-0 flex-1 rounded-2xl px-3"
      variant="secondary"
    >
      <InputGroup.Prefix className="min-w-0 gap-2 border-0 p-0">
        {chips.length ? (
          <div className="flex max-w-[58%] shrink-0 items-center gap-1 overflow-hidden">
            {visibleChips.map((chip) => (
              <FilterChip
                key={chip.key}
                icon={chip.icon}
                label={chip.label}
                onClear={chip.onClear}
              />
            ))}
            {hiddenChipCount > 0 ? (
              <span
                aria-label={`${hiddenChipCount} more active filters`}
                className="shrink-0 text-[11px] font-medium text-zinc-400"
              >
                +{hiddenChipCount}
              </span>
            ) : null}
          </div>
        ) : (
          <MagnifyingGlassIcon
            aria-hidden="true"
            className="shrink-0 text-zinc-500"
            size={16}
          />
        )}
      </InputGroup.Prefix>

      <InputGroup.Input
        aria-label="Search photos"
        className="min-w-[72px] px-2 text-xs text-zinc-100 placeholder:text-zinc-500"
        id="file-search"
        placeholder={
          currentFolder ? `Search ${currentFolder}` : "Search photos"
        }
        value={search}
        onBlur={handleBlur}
        onChange={(event) => setSearch(event.target.value)}
        onFocus={handleFocus}
      />

      {showClear ? (
        <InputGroup.Suffix className="border-0 p-0">
          <Button
            isIconOnly
            aria-label="Clear search and filters"
            className="editor-focus-ring h-7 w-7 min-w-7 rounded-xl bg-transparent text-zinc-500 hover:bg-white/[0.055] hover:text-zinc-200"
            size="sm"
            variant="ghost"
            onMouseDown={(event) => event.preventDefault()}
            onPress={clearFilters}
          >
            <XCircleIcon size={16} weight="duotone" />
          </Button>
        </InputGroup.Suffix>
      ) : null}
    </InputGroup>
  );
}
