export const RasterSourceSquare = ({ hasImage }: { hasImage: boolean }) => (
  <div className="flex aspect-square w-28 shrink-0 items-center justify-center rounded-sm border border-zinc-700/80 bg-zinc-900/60 text-xs text-zinc-500">
    {hasImage ? "No CFA Data" : "-"}
  </div>
);
