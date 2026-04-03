import { Select, SelectItem } from "@heroui/select";

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

  const selectedKeys =
    edited === null ? new Set<string>() : new Set([edited ? "yes" : "no"]);

  return (
    <Select
      className="max-w-24"
      classNames={{
        trigger:
          "rounded-[16px] border border-zinc-700/50 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] bg-[rgba(30,30,30,0.99)] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]",
      }}
      items={options}
      label="Edited"
      placeholder="Edited"
      selectedKeys={selectedKeys}
      size="sm"
      onSelectionChange={(keys) => {
        const next = Array.from(keys).at(0) ?? null;

        handleChange(next);
      }}
    >
      {(option) => <SelectItem>{option.label}</SelectItem>}
    </Select>
  );
}
