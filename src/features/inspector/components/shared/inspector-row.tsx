export const InspectorRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
    <span className="shrink-0">{label}</span>
    <span className="truncate text-zinc-200">{value}</span>
  </div>
);

export const CompactInspectorValue = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="min-w-0">
    <div className="text-[9px] uppercase tracking-wide text-zinc-500">
      {label}
    </div>
    <div className="truncate text-[11px] text-zinc-200">{value}</div>
  </div>
);
