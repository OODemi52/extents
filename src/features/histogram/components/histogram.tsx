import { useMemo } from "react";

import { useHistogram } from "@/features/histogram/hooks/use-histogram";
import {
  computeArea,
  computeCurve,
} from "@/features/histogram/utils/histogram-paths";
import { normalizeHistogramValues } from "@/features/histogram/utils/normalize-histogram-values";

export function Histogram() {
  const { histogram, isLoading } = useHistogram();
  const gridLines = [255, 192, 128, 64, 0];

  const normalized = useMemo(() => {
    if (!histogram) return null;

    return normalizeHistogramValues(histogram);
  }, [histogram]);

  if (!histogram || !normalized) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-zinc-500">
        {isLoading ? "" : "No image selected"}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full pr-2 py-2">
      <svg
        className="h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <g>
          {gridLines.map((value) => {
            const y = 100 - (value / 255) * 100;

            return (
              <line
                key={value}
                stroke="rgba(217, 163, 76, 0.25)"
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
