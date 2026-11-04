import { memo } from "react";
import { Dropdown, Header, Label, Separator } from "@heroui/react";
import {
  ArrowsDownUpIcon,
  SortAscendingIcon,
  SortDescendingIcon,
} from "@phosphor-icons/react";

import { ControlTooltip } from "./control-tooltip";

import {
  useFilterStore,
  type SortField,
} from "@/features/filter/stores/filter-store";

const SORT_FIELDS: { key: SortField; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "size", label: "Size" },
  { key: "ext", label: "Extension" },
  { key: "rating", label: "Rating" },
];

export const CompactSortMenu = memo(function CompactSortMenu() {
  const sort = useFilterStore((state) => state.sort);
  const setSort = useFilterStore((state) => state.setSort);
  const fieldLabel = SORT_FIELDS.find(
    (field) => field.key === sort.field,
  )?.label;
  const reverse = sort.direction === "desc";

  return (
    <Dropdown>
      <ControlTooltip
        label={`Sort photos: ${fieldLabel}, ${reverse ? "descending" : "ascending"}`}
      >
        <Dropdown.Trigger
          aria-label="Sort photos"
          className="next-compact-sort-trigger"
        >
          <ArrowsDownUpIcon size={18} />
        </Dropdown.Trigger>
      </ControlTooltip>
      <Dropdown.Popover
        className="next-sort-popover editor-tooltip min-w-44 rounded-lg p-1"
        placement="top start"
      >
        <Dropdown.Menu aria-label="Photo sorting">
          <Dropdown.Section
            disallowEmptySelection
            aria-label="Sort by"
            selectedKeys={[sort.field]}
            selectionMode="single"
            onSelectionChange={(keys) => {
              if (keys === "all") return;

              const field = SORT_FIELDS.find(({ key }) => keys.has(key));

              if (field) setSort({ field: field.key });
            }}
          >
            <Header className="px-2 py-1 text-xs text-zinc-400">Sort by</Header>
            {SORT_FIELDS.map(({ key, label }) => (
              <Dropdown.Item
                key={key}
                shouldCloseOnSelect
                id={key}
                textValue={label}
              >
                <Label>{label}</Label>
                <Dropdown.ItemIndicator />
              </Dropdown.Item>
            ))}
          </Dropdown.Section>
          <Separator />
          <Dropdown.Section
            aria-label="Sort direction"
            selectedKeys={reverse ? ["reverse"] : []}
            selectionMode="multiple"
            onSelectionChange={(keys) => {
              setSort({
                direction:
                  keys === "all" || keys.has("reverse") ? "desc" : "asc",
              });
            }}
          >
            <Dropdown.Item
              id="reverse"
              shouldCloseOnSelect={false}
              textValue="Reverse order"
            >
              <Label className="flex-1">Reverse order</Label>
              <span
                aria-hidden="true"
                className="flex shrink-0 text-zinc-400"
                data-sort-direction={sort.direction}
              >
                {reverse ? (
                  <SortDescendingIcon size={16} />
                ) : (
                  <SortAscendingIcon size={16} />
                )}
              </span>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
});
