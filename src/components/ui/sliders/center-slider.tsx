import { useEffect, useMemo, useRef, useState } from "react";
import { Input, Slider } from "@heroui/react";

interface CenteredSliderProps {
  range: number;
  label: string;
  fillColor?: string;
  trackColor?: string;
  defaultValue?: number;
  unit?: string;
  onValueChange?: (value: number) => void;
}

const TRACK_GRADIENTS: Record<string, string> = {
  "bg-linear-to-r from-blue-500 to-yellow-500":
    "linear-gradient(to right, rgb(59 130 246), rgb(234 179 8))",
  "bg-linear-to-r from-green-500 to-pink-500":
    "linear-gradient(to right, rgb(34 197 94), rgb(236 72 153))",
  "bg-linear-to-r from-zinc-700 to-zinc-500":
    "linear-gradient(to right, rgba(63, 63, 70, 0.84), rgba(145, 145, 155, 0.8))",
};

export function CenteredSlider({
  range = 1,
  fillColor = "bg-white",
  trackColor,
  label,
  defaultValue = 0,
  unit,
  onValueChange,
}: CenteredSliderProps) {
  const [value, setValue] = useState(defaultValue);
  const [draftValue, setDraftValue] = useState("");
  const [isEditingValue, setIsEditingValue] = useState(false);
  const valueInputRef = useRef<HTMLInputElement>(null);
  const hasCustomTrack = Boolean(trackColor);
  const trackGradient = useMemo(
    () => (trackColor ? TRACK_GRADIENTS[trackColor] : undefined),
    [trackColor],
  );
  const thumbPercent = ((value + range) / (range * 2)) * 100;
  const fillStart = Math.min(50, thumbPercent);
  const fillWidth = Math.abs(thumbPercent - 50);

  useEffect(() => {
    setValue(defaultValue);
    setIsEditingValue(false);
    setDraftValue("");
  }, [defaultValue]);

  useEffect(() => {
    if (!isEditingValue) return;

    valueInputRef.current?.focus();
    valueInputRef.current?.select();
  }, [isEditingValue]);

  const resetValue = () => {
    setValue(0);
    setIsEditingValue(false);
    setDraftValue("");
    onValueChange?.(0);
  };

  const startEditingValue = () => {
    setDraftValue(value.toFixed(2));
    setIsEditingValue(true);
  };

  const cancelEditingValue = () => {
    setIsEditingValue(false);
    setDraftValue("");
  };

  const commitDraftValue = () => {
    const normalizedValue = draftValue.trim().replace(",", ".");
    const parsedValue = Number(normalizedValue);

    if (!normalizedValue || !Number.isFinite(parsedValue)) {
      cancelEditingValue();

      return;
    }

    const nextValue =
      Math.round(Math.max(-range, Math.min(range, parsedValue)) * 100) / 100;

    setValue(nextValue);
    setIsEditingValue(false);
    setDraftValue("");
    if (nextValue !== value) {
      onValueChange?.(nextValue);
    }
  };

  const formatValue = (nextValue: number | number[]) => {
    const numericValue = Array.isArray(nextValue)
      ? (nextValue[0] ?? 0)
      : nextValue;
    const prefix = numericValue > 0 ? "+" : "";

    return `${prefix}${numericValue.toFixed(2)}${unit ? ` ${unit}` : ""}`;
  };

  return (
    <Slider
      aria-label={label}
      className="grid gap-0.5 pb-1"
      maxValue={range}
      minValue={-range}
      step={0.01}
      style={
        trackGradient
          ? ({
              "--slider-track-gradient": trackGradient,
            } as React.CSSProperties)
          : undefined
      }
      value={value}
      onChange={(nextValue) => {
        const value = Array.isArray(nextValue)
          ? (nextValue[0] ?? 0)
          : nextValue;

        setValue(value);
        onValueChange?.(value);
      }}
      onDoubleClick={resetValue}
    >
      <div className="flex min-h-5 items-center justify-between gap-2">
        {(() => {
          const canReset = Math.abs(value) >= 0.0001;

          return (
            <button
              aria-label={`Reset ${label.toLowerCase()}`}
              className={`editor-focus-ring group relative h-5 min-w-0 bg-transparent p-0 text-left text-xs font-medium text-zinc-300 transition-colors ${
                canReset
                  ? "cursor-pointer hover:text-zinc-100"
                  : "cursor-default"
              }`}
              disabled={!canReset}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                resetValue();
              }}
            >
              <span
                className={
                  canReset
                    ? "transition-opacity group-hover:opacity-0 group-focus:opacity-0"
                    : undefined
                }
              >
                {label}
              </span>
              {canReset ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100"
                >
                  Reset
                </span>
              ) : null}
            </button>
          );
        })()}
        <span className="flex items-center">
          {isEditingValue ? (
            <Input
              ref={valueInputRef}
              aria-label={`Set ${label.toLowerCase()}`}
              className="slider-value-input h-5 w-[52px] shrink-0 rounded-md border border-transparent bg-white/[0.06] px-1 py-0 text-right text-[11px] font-medium leading-none tabular-nums text-zinc-100 shadow-none focus:bg-white/[0.08]"
              inputMode="decimal"
              value={draftValue}
              variant="secondary"
              onBlur={commitDraftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              onDoubleClick={(event) => event.stopPropagation()}
              onFocus={(event) => event.target.select()}
              onKeyDown={(event) => {
                event.stopPropagation();

                if (event.key === "Enter") {
                  event.preventDefault();
                  commitDraftValue();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  cancelEditingValue();
                }
              }}
            />
          ) : (
            <button
              aria-label={`Edit ${label.toLowerCase()} value`}
              className="editor-focus-ring h-5 w-[52px] shrink-0 cursor-text rounded-md bg-transparent p-0 text-right text-[10px] font-medium leading-none tabular-nums text-zinc-300"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                startEditingValue();
              }}
              onDoubleClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <output className="pointer-events-none block w-full">
                {formatValue(value)}
              </output>
            </button>
          )}
        </span>
      </div>

      <Slider.Track className="relative h-5 w-full border-x-[0.75rem] border-x-transparent bg-transparent">
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-xl ${trackGradient ? "" : (trackColor ?? "bg-zinc-700")}`}
          style={
            trackGradient
              ? { backgroundImage: "var(--slider-track-gradient)" }
              : undefined
          }
        />
        {!hasCustomTrack || !trackGradient ? (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-xl ${fillColor}`}
            style={{ left: `${fillStart}%`, width: `${fillWidth}%` }}
          />
        ) : null}
        <Slider.Thumb className="cursor-grab bg-transparent after:h-2 after:w-5 after:rounded-full after:border after:border-zinc-300/60 after:bg-zinc-400 after:shadow-md data-[dragging=true]:cursor-grabbing data-[dragging=true]:after:border-zinc-100 data-[dragging=true]:after:bg-zinc-200 data-[dragging=true]:after:ring-2 data-[dragging=true]:after:ring-white/20" />
      </Slider.Track>
    </Slider>
  );
}
