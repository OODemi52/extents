import { useEffect } from "react";

import { Select, SelectItem } from "@heroui/select";

import {
  rendererDebugViewModeByKey,
  rendererDebugViews,
  useRendererDebugStore,
  type RendererDebugViewKey,
} from "@/store/renderer-debug-store";
import { api } from "@/services/api";

export function RendererDebugSelect() {
  const debugView = useRendererDebugStore((state) => state.debugView);
  const setDebugView = useRendererDebugStore((state) => state.setDebugView);

  useEffect(() => {
    api.renderer
      .setDebugView({ debugView: rendererDebugViewModeByKey[debugView] })
      .catch((error) =>
        console.error("[renderer-debug] Failed to sync debug view:", error),
      );
  }, [debugView]);

  return (
    <Select
      disallowEmptySelection
      aria-label="Renderer debug view"
      className="w-full"
      classNames={{
        label: "text-[11px] uppercase tracking-[0.2em] text-zinc-500",
        trigger:
          "min-h-10 rounded-2xl border border-zinc-700/50 bg-[rgba(24,24,27,0.98)] shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]",
        value: "text-sm text-zinc-200",
      }}
      label="Renderer Debug"
      selectedKeys={new Set([debugView])}
      size="sm"
      onSelectionChange={(keys) => {
        const next = Array.from(keys).at(0) as RendererDebugViewKey | undefined;

        if (!next) {
          return;
        }

        setDebugView(next);
      }}
    >
      {rendererDebugViews.map((view) => (
        <SelectItem key={view.key}>{view.label}</SelectItem>
      ))}
    </Select>
  );
}
