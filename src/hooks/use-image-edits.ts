import { useState } from "react";

export function useImageEdits() {
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(1);

  const updateBrightness = (value: number) => {
    // eslint-disable-next-line no-console
    console.log("Updating Brightness:", value);
    setBrightness(value);
  };

  const updateContrast = (value: number) => {
    // eslint-disable-next-line no-console
    console.log("Updating Contrast:", value);
    setContrast(value);
  };

  return {
    brightness,
    updateBrightness,
    contrast,
    updateContrast,
  };
}
