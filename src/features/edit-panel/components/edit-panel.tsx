import { memo, useRef } from "react";
import { Card } from "@heroui/react";
import { ImageSquareIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/ui/empty-state";
import { BasicAdjustmentsPanel } from "@/features/edit-panel/basic-adjustments/components/basic-adjustments-panel";
import { GeometryPanel } from "@/features/edit-panel/geometry/components/geometry-panel";
import { RetouchPanel } from "@/features/edit-panel/retouch/components/retouch-panel";
import { AiPanel } from "@/features/edit-panel/ai/components/ai-panel";
import { PresetsPanel } from "@/features/edit-panel/presets/components/presets-panel";
import { Histogram } from "@/features/histogram/components/histogram";
import { useLayoutStore } from "@/store/layout-store";
import { useImageStore } from "@/store/image-store";

type EditPanelProps = {
  active?: boolean;
};

export const EditPanel = memo(function EditPanel({
  active = true,
}: EditPanelProps) {
  const retainedTabRef = useRef(useLayoutStore.getState().activeEditTab);
  const retainedSelectionRef = useRef(
    useImageStore.getState().selectedIndex !== null,
  );
  const activeEditTab = useLayoutStore((state) =>
    active ? state.activeEditTab : retainedTabRef.current,
  );
  const hasSelection = useImageStore((state) =>
    active ? state.selectedIndex !== null : retainedSelectionRef.current,
  );

  if (active) {
    retainedTabRef.current = activeEditTab;
    retainedSelectionRef.current = hasSelection;
  }

  const renderActiveTab = () => {
    switch (activeEditTab) {
      case "basic":
        return <BasicAdjustmentsPanel active={active} />;
      case "presets":
        return <PresetsPanel />;
      case "ai":
        return <AiPanel />;
      case "crop":
        return <GeometryPanel />;
      case "detail":
        return <RetouchPanel />;
      default:
        return <EmptyState compact title="Tool unavailable" />;
    }
  };

  return (
    <aside
      aria-label="Editing tools"
      className="editor-panel flex h-full flex-col p-2"
    >
      <div className="px-2 pb-2 pt-1 text-xs font-semibold text-zinc-300">
        Edit
      </div>
      <Card className="editor-surface mb-2 h-32 w-full flex-shrink-0 rounded-[16px] p-2 shadow-none">
        <Histogram active={active} />
      </Card>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-[16px] bg-transparent">
        {hasSelection ? (
          renderActiveTab()
        ) : (
          <EmptyState
            compact
            className="h-full"
            graphic={
              <ImageSquareIcon
                className="text-zinc-600"
                size={28}
                weight="duotone"
              />
            }
            title="No photo selected"
          />
        )}
      </div>
    </aside>
  );
});
