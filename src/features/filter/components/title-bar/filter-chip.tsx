import { Chip } from "@heroui/chip";
import { ReactNode } from "react";

type FilterChipProps = {
  label: string;
  icon?: ReactNode;
  onClear?: () => void;
};

export function FilterChip({ label, icon, onClear }: FilterChipProps) {
  return (
    <Chip
      className="bg-zinc-800 text-gray-100 border border-zinc-700"
      color="default"
      isCloseable={Boolean(onClear)}
      radius="full"
      size="sm"
      startContent={icon}
      variant="faded"
      onClose={onClear}
      onMouseDown={(e) => e.preventDefault()}
    >
      {label}
    </Chip>
  );
}
