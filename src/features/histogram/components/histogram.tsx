import { useMemo } from "react";
import { Skeleton } from "@heroui/react";

import { EmptyState } from "@/components/ui/empty-state";
import { useHistogram } from "@/features/histogram/hooks/use-histogram";
import {
  computeArea,
  computeCurve,
} from "@/features/histogram/utils/histogram-paths";
import { normalizeHistogramValues } from "@/features/histogram/utils/normalize-histogram-values";

type HistogramProps = {
  active?: boolean;
};

export function Histogram({ active = true }: HistogramProps) {
  const { histogram, isLoading, error } = useHistogram(active);
  const gridLines = [255, 192, 128, 64, 0];

  const normalized = useMemo(() => {
    if (!histogram) return null;

    return normalizeHistogramValues(histogram);
  }, [histogram]);

  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label="Building histogram"
        className="relative h-full overflow-hidden rounded-[16px] p-2"
        role="status"
      >
        <Skeleton className="h-full w-full rounded-[16px] bg-zinc-700/30" />
        <span className="sr-only">Building histogram...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center"
        role="alert"
      >
        <p className="text-xs font-semibold text-zinc-300">
          Histogram unavailable
        </p>
        <p className="text-[11px] leading-4 text-zinc-500">
          This photo could not be analyzed.
        </p>
      </div>
    );
  }

  if (!histogram || !normalized) {
    return (
      <EmptyState
        compact
        className="h-full !gap-1 !px-2 !py-2"
        title="No histogram"
      />
    );
  }

  return (
    <div className="relative h-full w-full p-2">
      <svg
        aria-label="RGB and luminance histogram"
        className="h-full w-full"
        preserveAspectRatio="none"
        role="img"
        viewBox="0 0 100 100"
      >
        <title>RGB and luminance histogram</title>
        <g>
          {gridLines.map((value) => {
            const y = 100 - (value / 255) * 100;

            return (
              <line
                key={value}
                stroke="rgba(161, 161, 170, 0.16)"
                strokeWidth="0.5"
                x1="0"
                x2="100"
                y1={y}
                y2={y}
              />
            );
          })}
        </g>
        <path
          d={computeArea(normalized.luma)}
          fill="rgba(226, 232, 240, 0.15)"
        />
        <polyline
          fill="none"
          points={computeCurve(normalized.luma)}
          stroke="rgba(241, 245, 249, 0.9)"
          strokeWidth="0.4"
        />
        <path
          d={computeArea(normalized.red)}
          fill="rgba(248, 113, 113, 0.15)"
        />
        <polyline
          fill="none"
          points={computeCurve(normalized.red)}
          stroke="rgba(248, 113, 113, 0.75)"
          strokeWidth="0.4"
        />
        <path
          d={computeArea(normalized.green)}
          fill="rgba(74, 222, 128, 0.15)"
        />
        <polyline
          fill="none"
          points={computeCurve(normalized.green)}
          stroke="rgba(74, 222, 128, 0.75)"
          strokeWidth="0.4"
        />
        <path d={computeArea(normalized.blue)} fill="rgba(30, 64, 175, 0.2)" />
        <polyline
          fill="none"
          points={computeCurve(normalized.blue)}
          stroke="rgba(37, 99, 235, 0.8)"
          strokeWidth="0.4"
        />
      </svg>
    </div>
  );
}
