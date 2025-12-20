import { Button } from "@heroui/button";
import { Select, SelectItem, SelectSection } from "@heroui/select";
import {
  SortAscendingIcon,
  SortDescendingIcon,
} from "@phosphor-icons/react/dist/ssr";

import { useFilterStore, type SortField } from "../../stores/filter-store";

const SORT_OPTIONS: { key: SortField; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "size", label: "Size" },
  { key: "ext", label: "Extension" },
  { key: "rating", label: "Rating" },
];

export function SortSelect() {
  const sort = useFilterStore((state) => state.sort);
  const setSort = useFilterStore((state) => state.setSort);

  const selectedKeys = new Set([sort.field]);
  const isAsc = sort.direction === "asc";

  const handleToggleDirection = () => {
    setSort({ direction: isAsc ? "desc" : "asc" });
  };

  return (
    <Select
      disallowEmptySelection
      aria-label="Sort by"
      className="max-w-40"
      selectedKeys={selectedKeys}
      size="sm"
      startContent={
        isAsc ? (
          <SortAscendingIcon size={16} weight="duotone" />
        ) : (
          <SortDescendingIcon size={16} weight="duotone" />
        )
      }
      variant="faded"
      onSelectionChange={(keys) => {
        const next = Array.from(keys).at(0) as SortField | undefined;

        if (!next) return;

        setSort({ field: next });
      }}
    >
      <SelectSection showDivider title="Sort by">
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.key}>{option.label}</SelectItem>
        ))}
      </SelectSection>
      <SelectSection>
        <SelectItem
          key="order"
          hideSelectedIcon
          isReadOnly
          className="flex justify-between h-9 p-0 rounded-xl"
          classNames={{ base: "cursor-default" }}
        >
          <Button
            disableRipple
            aria-label="Toggle sort order"
            className="w-full justify-between gap-2 p-2"
            size="sm"
            title="Toggle sort order"
            variant="light"
            onPress={handleToggleDirection}
          >
            {isAsc ? "Ascending" : "Descending"}
            <>
              {isAsc ? (
                <SortAscendingIcon size={14} weight="duotone" />
              ) : (
                <SortDescendingIcon size={14} weight="duotone" />
              )}
            </>
          </Button>
        </SelectItem>
      </SelectSection>
    </Select>
  );
}
