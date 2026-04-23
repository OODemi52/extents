import { create } from "zustand";
import { persist } from "zustand/middleware";

export const rendererDebugViews = [
  { key: "final_display", label: "Final Display", mode: 0 },
  { key: "working_luminance", label: "Working Luminance", mode: 1 },
  { key: "exposed_luminance", label: "Exposed Luminance", mode: 2 },
  { key: "tone_mapped_luminance", label: "Tone-Mapped Luminance", mode: 3 },
  {
    key: "output_linear_srgb_luminance",
    label: "Output Linear sRGB Luminance",
    mode: 4,
  },
  { key: "out_of_range_mask", label: "Out-of-Range Mask", mode: 5 },
  { key: "working_rgb_channels", label: "Working RGB Channels", mode: 6 },
  { key: "exposed_rgb_channels", label: "Exposed RGB Channels", mode: 7 },
  {
    key: "display_domain_rgb_channels",
    label: "Display-Domain RGB Channels",
    mode: 8,
  },
  {
    key: "output_linear_srgb_color",
    label: "Output Linear sRGB Color",
    mode: 9,
  },
  {
    key: "final_display_no_tone_map",
    label: "Final Display (No Tone Map)",
    mode: 10,
  },
  {
    key: "final_display_with_output_soft_clip",
    label: "Final Display (With Output Soft Clip)",
    mode: 11,
  },
] as const;

export type RendererDebugViewKey = (typeof rendererDebugViews)[number]["key"];

const defaultDebugView = rendererDebugViews[0].key;

interface RendererDebugState {
  debugView: RendererDebugViewKey;
  setDebugView: (debugView: RendererDebugViewKey) => void;
}

export const useRendererDebugStore = create<RendererDebugState>()(
  persist(
    (set) => ({
      debugView: defaultDebugView,
      setDebugView: (debugView) => set({ debugView }),
    }),
    {
      name: "extents-renderer-debug",
      partialize: (state) => ({ debugView: state.debugView }),
    },
  ),
);

export const rendererDebugViewModeByKey = Object.fromEntries(
  rendererDebugViews.map((view) => [view.key, view.mode]),
) as Record<RendererDebugViewKey, number>;
