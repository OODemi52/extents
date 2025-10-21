import { useState } from "react";
import { Slider } from "@heroui/slider";

interface CenteredSliderProps {
  range: number;
  label: string;
  fillColor?: string;
  trackColor?: string;
  defaultValue?: number;
}

export function CenteredSlider({
  range = 1,
  fillColor = "bg-white",
  trackColor,
  label,
  defaultValue = 0,
}: CenteredSliderProps) {
  const [value, setValue] = useState(0);

  return (
    <Slider
      classNames={{
        filler: `${trackColor ? "bg-transparent" : fillColor} rounded-xl`,
        track: `${trackColor} !border-transparent !data-[fill-start=true]:border-s-transparent !data-[fill-end=true]:border-e-transparent`,
        label: "font-light text-xs text-white/65 tracking-tight",
        value: "font-light text-xs text-white/65",
      }}
      defaultValue={defaultValue}
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
      // value={value}
      onChange={() => setValue}
      onDoubleClick={() => setValue(0)}
    />
  );
}
