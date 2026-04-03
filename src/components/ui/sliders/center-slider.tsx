import { useEffect, useMemo, useState } from "react";
import { Slider, type SliderProps } from "@heroui/slider";

interface CenteredSliderProps {
  range: number;
  label: string;
  fillColor?: string;
  trackColor?: string;
  defaultValue?: number;
  color?: SliderProps["color"];
}

const TRACK_GRADIENTS: Record<string, string> = {
  "bg-linear-to-r from-blue-500 to-yellow-500":
    "linear-gradient(to right, rgb(59 130 246), rgb(234 179 8))",
  "bg-linear-to-r from-green-500 to-pink-500":
    "linear-gradient(to right, rgb(34 197 94), rgb(236 72 153))",
};

export function CenteredSlider({
  range = 1,
  fillColor = "bg-white",
  trackColor,
  label,
  defaultValue = 0,
  color,
}: CenteredSliderProps) {
  const [value, setValue] = useState(defaultValue);
  const hasCustomTrack = Boolean(trackColor);
  const trackGradient = useMemo(
    () => (trackColor ? TRACK_GRADIENTS[trackColor] : undefined),
    [trackColor],
  );

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  return (
    <Slider
      classNames={{
        trackWrapper: trackGradient
          ? "relative before:pointer-events-none before:absolute before:inset-x-0 before:top-1/2 before:h-1 before:-translate-y-1/2 before:rounded-xl before:[background-image:var(--slider-track-gradient)] before:content-['']"
          : undefined,
        filler: `${hasCustomTrack ? "bg-transparent" : fillColor} rounded-xl`,
        track: `${trackGradient ? "bg-transparent" : (trackColor ?? "")} !border-transparent !border-x-transparent !border-y-transparent [data-fill-start=true]:!border-s-transparent [data-fill-end=true]:!border-e-transparent [data-fill-start=true]:!border-b-transparent [data-fill-end=true]:!border-t-transparent`,
        label: "font-medium text-xs text-white tracking-tight",
        value: "font-medium text-xs text-white",
      }}
      color={hasCustomTrack ? (color ?? "foreground") : color}
      fillOffset={0}
      label={label}
      maxValue={range}
      minValue={-range}
      renderThumb={(props) => (
        <div
          {...props}
          className="group top-1/2
                     bg-default-400 dark:bg-default-500
                     shadow-md w-5 h-2 rounded-full
                     cursor-grab data-[dragging=true]:cursor-grabbing
                     transition-transform data-[dragging=true]:scale-110
                     data-[dragging=true]:bg-transparent dark:data-[dragging=true]:bg-transparent
                     data-[dragging=true]:border border border-gray-400 dark:data-[dragging=true]:border"
        />
      )}
      size="sm"
      step={0.01}
      style={
        trackGradient
          ? ({
              "--slider-track-gradient": trackGradient,
            } as React.CSSProperties)
          : undefined
      }
      value={value}
      onChange={(nextValue) =>
        setValue(Array.isArray(nextValue) ? (nextValue[0] ?? 0) : nextValue)
      }
      onDoubleClick={() => setValue(0)}
    />
  );
}
