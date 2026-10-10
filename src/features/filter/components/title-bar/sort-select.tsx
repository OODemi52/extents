import { Button, ListBox, Select } from "@heroui/react";
import {
  SortAscendingIcon,
  SortDescendingIcon,
} from "@phosphor-icons/react/dist/ssr";

import { useFilterStore, type SortField } from "../../stores/filter-store";

import { EditorTooltip } from "@/components/ui/editor-tooltip";

const SORT_OPTIONS: { key: SortField; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "size", label: "Size" },
  { key: "ext", label: "Extension" },
  { key: "rating", label: "Rating" },
];

export function SortSelect() {
  const sort = useFilterStore((state) => state.sort);
  const setSort = useFilterStore((state) => state.setSort);

  const isAscending = sort.direction === "asc";
  const directionLabel = isAscending
    ? "Sort ascending. Change to descending"
    : "Sort descending. Change to ascending";

  return (
    <div className="editor-control-surface flex h-10 w-[150px] shrink-0 items-center rounded-2xl p-0.5">
      <Select
        aria-label="Sort photos by"
        className="min-w-0 flex-1"
        value={sort.field}
        variant="secondary"
        onChange={(key) => {
          if (key) setSort({ field: key as SortField });
        }}
      >
        <Select.Trigger className="h-9 min-h-9 rounded-xl border-0 bg-transparent px-2 text-xs shadow-none data-[focus-visible=true]:bg-white/[0.055]">
          <Select.Value className="text-xs text-zinc-200" />
          <Select.Indicator className="text-zinc-500" />
        </Select.Trigger>
        <Select.Popover className="editor-tooltip min-w-32 rounded-xl p-1">
          <ListBox>
            {SORT_OPTIONS.map((option) => (
              <ListBox.Item
                key={option.key}
                className="rounded-lg px-2 py-1.5 text-xs text-zinc-300 data-[focused=true]:bg-white/[0.07] data-[selected=true]:text-zinc-100"
                id={option.key}
                textValue={option.label}
              >
                {option.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <div aria-hidden="true" className="h-5 w-px shrink-0 bg-white/[0.07]" />

      <EditorTooltip content={directionLabel}>
        <Button
          isIconOnly
          aria-label={directionLabel}
          className="editor-focus-ring h-8 w-8 min-w-8 rounded-xl bg-transparent text-zinc-400 hover:bg-white/[0.055] hover:text-zinc-100"
          size="sm"
          variant="ghost"
          onPress={() => setSort({ direction: isAscending ? "desc" : "asc" })}
        >
          {isAscending ? (
            <SortAscendingIcon size={16} weight="duotone" />
          ) : (
            <SortDescendingIcon size={16} weight="duotone" />
          )}
        </Button>
      </EditorTooltip>
    </div>
  );
}
