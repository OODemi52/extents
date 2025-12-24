import { useMemo, useState } from "react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import {
  FlagIcon,
  FolderSimpleIcon,
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
  icon: JSX.Element;
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
      if (flag === "flagged") return "Flagged";
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

  return (
    <Input
      className="flex-1 px-4"
      classNames={{
        inputWrapper: "items-center",
        innerWrapper: "items-center gap-2",
      }}
      endContent={
        showClear ? (
          <Button
            isIconOnly
            className="hover:bg-transparent"
            size="sm"
            variant="light"
            onMouseDown={(event) => event.preventDefault()}
            onPress={() => {
              setSearch("");
              setRating(null);
              setFlags([]);
              setSize(null);
              setExts([]);
              setEdited(null);
            }}
          >
            <XCircleIcon size={16} weight="duotone" />
          </Button>
        ) : null
      }
      id="file-search"
      placeholder={currentFolder ? `Search ${currentFolder}` : "Search"}
      startContent={
        chips.length ? (
          <div className="flex flex-row items-center gap-1 min-h-[28px]">
            {chips.map((chip) => (
              <FilterChip
                key={chip.key}
                icon={chip.icon}
                label={chip.label}
                onClear={chip.onClear}
              />
            ))}
          </div>
        ) : null
      }
      value={search}
      variant="faded"
      onBlur={handleBlur}
      onChange={(event) => setSearch(event.target.value)}
      onFocus={handleFocus}
    />
  );
}
