import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { RocketLaunchIcon, ExportIcon } from "@phosphor-icons/react";

import { BasicAdjustmentsPanel } from "@/features/edit-panel/basic-adjustments/components/basic-adjustments-panel";
import { GeometryPanel } from "@/features/edit-panel/geometry/components/geometry-panel";
import { RetouchPanel } from "@/features/edit-panel/retouch/components/retouch-panel";
import { AiPanel } from "@/features/edit-panel/ai/components/ai-panel";
import { PresetsPanel } from "@/features/edit-panel/presets/components/presets-panel";
import { Histogram } from "@/features/histogram/components/histogram";
import { useLayoutStore } from "@/store/layout-store";

export function EditPanel() {
  const { activeEditTab } = useLayoutStore();

  const renderActiveTab = () => {
    switch (activeEditTab) {
      case "basic":
        return <BasicAdjustmentsPanel />;
      case "presets":
        return <PresetsPanel />;
      case "ai":
        return <AiPanel />;
      case "crop":
        return <GeometryPanel />;
      case "detail":
        return <RetouchPanel />;
      default:
        return (
          <div className="flex h-full items-center justify-center rounded-xl bg-zinc-800 text-sm text-zinc-500">
            Panel coming soon...
          </div>
        );
    }
  };

  return (
    <aside className="h-full border border-zinc-700/50 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] bg-[rgba(30,30,30,0.99)] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)] rounded-3xl flex flex-col p-2">
      <div className="pointer-events-none w-10/12 mx-auto absolute inset-x-0 top-0 z-20 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.08),rgba(255,255,255,0))]" />
      <Card className="w-full h-32 mb-2 bg-zinc-800 flex-shrink-0 p-2">
        <Histogram />
      </Card>

      <div className="flex-1 overflow-y-auto rounded-xl bg-transparent min-h-0">
        {renderActiveTab()}
      </div>

      <div className="flex flex-row gap-2 pt-2 flex-shrink-0">
        <Button
          isDisabled
          className="rounded-md w-full shadow-md"
          color="default"
          size="sm"
          startContent={<RocketLaunchIcon />}
        >
          Export
        </Button>
        <Button
          isDisabled
          isIconOnly
          className="rounded-md shadow-md"
          color="default"
          size="sm"
          startContent={<ExportIcon />}
        />
      </div>
    </aside>
  );
}
