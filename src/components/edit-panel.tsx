import { useImageEdits } from "../store/image-edits";

export function EditPanel() {
  const { brightness, setBrightness, contrast, setContrast } = useImageEdits();

  return (
    <div className="bg-zinc-950/50 px-8 flex flex-col min-w-60 w-60">
      <div>
        <label
          className="block text-sm text-foreground-50 font-medium"
          htmlFor="brightness"
        >
          Brightness
        </label>
        <input
          id="brightness"
          max={1}
          min={-1}
          step={0.01}
          type="range"
          value={brightness}
          onChange={(e) => setBrightness(parseFloat(e.target.value))}
        />
        <div className="text-xs text-gray-600">{brightness.toFixed(2)}</div>
      </div>

      <div>
        <label
          className="block text-sm text-foreground-50 font-medium"
          htmlFor="contrast"
        >
          Contrast {contrast}
        </label>
        <input
          id="contrast"
          max={4}
          min={0}
          step={0.01}
          type="range"
          value={contrast}
          onChange={(e) => setContrast(parseFloat(e.target.value))}
        />
        <div className="text-xs text-gray-600">{contrast.toFixed(2)}</div>
      </div>
    </div>
  );
}
