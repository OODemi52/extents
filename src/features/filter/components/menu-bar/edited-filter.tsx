import { ListBox, Select } from "@heroui/react";

import { useFilterStore } from "../../stores/filter-store";

const options = [
  { key: "yes", label: "Yes" },
  { key: "no", label: "No" },
];

export function EditedFilter() {
  const setEdited = useFilterStore((state) => state.setEdited);
  const edited = useFilterStore((state) => state.edited);

  const handleChange = (key: string | number | null) => {
    if (!key) {
      setEdited(null);

      return;
    }

    if (key === "yes") {
      setEdited(edited === true ? null : true);

      return;
    }

    if (key === "no") {
      setEdited(edited === false ? null : false);
    }
  };

  const selectedValue = edited === null ? null : edited ? "yes" : "no";

  return (
    <Select
      aria-label="Filter by edit status"
      className="w-28"
      placeholder="Edited"
      value={selectedValue}
      variant="secondary"
      onChange={handleChange}
    >
      <Select.Trigger className="editor-control-surface h-9 min-h-9 rounded-[16px] shadow-none">
        <Select.Value className="text-xs text-zinc-300" />
        <Select.Indicator className="text-zinc-500" />
      </Select.Trigger>
      <Select.Popover className="editor-tooltip rounded-xl p-1">
        <ListBox>
          {options.map((option) => (
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
  );
}
