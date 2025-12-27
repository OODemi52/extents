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
      items={options}
      label="Edited"
      placeholder="Edited"
      selectedKeys={selectedKeys}
      size="sm"
      variant="faded"
      onSelectionChange={(keys) => {
        const next = Array.from(keys).at(0) ?? null;

        handleChange(next);
      }}
    >
      {(option) => <SelectItem>{option.label}</SelectItem>}
    </Select>
  );
}
