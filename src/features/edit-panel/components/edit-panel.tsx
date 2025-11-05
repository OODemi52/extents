import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { RocketLaunchIcon, ExportIcon } from "@phosphor-icons/react";

import { ThemeSwitch } from "@/components/theme-switch";
import { BasicAdjustmentsPanel } from "@/features/edit-panel/basic-adjustments/components/basic-adjustments-panel";
import { GeometryPanel } from "@/features/edit-panel/geometry/components/geometry-panel";
import { RetouchPanel } from "@/features/edit-panel/retouch/components/retouch-panel";
import { AiPanel } from "@/features/edit-panel/ai/components/ai-panel";
import { PresetsPanel } from "@/features/edit-panel/presets/components/presets-panel";
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
    <aside className="h-full bg-zinc-900/99 border border-white/15 rounded-xl flex flex-col p-2">
      <Card className="w-full h-32 mb-2 bg-zinc-800 text-center flex-shrink-0">
        Histogram Place Holder
      </Card>

      <ThemeSwitch />

      <div className="flex-1 overflow-y-auto rounded-xl bg-transparent min-h-0">
        {renderActiveTab()}
      </div>

      <div className="flex flex-row gap-2 pt-2 flex-shrink-0">
        <Button
          className="rounded-md w-full shadow-md"
          color="default"
          size="sm"
          startContent={<RocketLaunchIcon />}
        >
          Export
        </Button>
        <Button
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
