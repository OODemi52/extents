import { Chip } from "@heroui/react";
import { XIcon } from "@phosphor-icons/react";
import { ReactNode } from "react";

type FilterChipProps = {
  label: string;
  icon?: ReactNode;
  onClear?: () => void;
};

export function FilterChip({ label, icon, onClear }: FilterChipProps) {
  return (
    <Chip
      className="flex items-center gap-1 border border-zinc-700 bg-zinc-800 text-gray-100"
      size="sm"
      variant="secondary"
      onMouseDown={(e) => e.preventDefault()}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <Chip.Label className="truncate">{label}</Chip.Label>
      {onClear ? (
        <button
          aria-label={`Remove ${label} filter`}
          className="-mr-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
          type="button"
          onClick={onClear}
        >
          <XIcon size={10} weight="bold" />
        </button>
      ) : null}
    </Chip>
  );
}
