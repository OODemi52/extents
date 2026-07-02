import type {
  CfaCellInspection,
  CfaPatternInspection,
} from "@/types/inspection";

export const CfaPatternGrid = ({ cfa }: { cfa: CfaPatternInspection }) => {
  const previewSize = 8;
  const cells = repeatedCfaCells(cfa, previewSize);

  return (
    <div
      className="grid aspect-square w-28 shrink-0 overflow-hidden rounded-sm border border-zinc-700/80"
      style={{
        gridTemplateColumns: `repeat(${previewSize}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${previewSize}, minmax(0, 1fr))`,
      }}
    >
      {cells.map((cell, index) => (
        <div key={`${cell.code}-${index}`} className={cfaCellClassName(cell)} />
      ))}
    </div>
  );
};

const repeatedCfaCells = (cfa: CfaPatternInspection, previewSize: number) => {
  const cells: CfaCellInspection[] = [];

  for (let y = 0; y < previewSize; y += 1) {
    for (let x = 0; x < previewSize; x += 1) {
      const sourceX = x % cfa.width;
      const sourceY = y % cfa.height;
      const sourceIndex = sourceY * cfa.width + sourceX;
      const cell = cfa.cells[sourceIndex];

      if (cell) {
        cells.push(cell);
      }
    }
  }

  return cells;
};

const cfaCellClassName = (cell: CfaCellInspection) => {
  const base = "flex items-center justify-center border border-zinc-950/70";

  if (cell.label === "R") {
    return `${base} bg-red-500/75 text-red-200`;
  }

  if (cell.label === "G") {
    return `${base} bg-emerald-500/75 text-emerald-200`;
  }

  if (cell.label === "B") {
    return `${base} bg-sky-500/75 text-sky-200`;
  }

  return `${base} bg-zinc-800 text-zinc-300`;
};
