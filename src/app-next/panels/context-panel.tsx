import { memo, useRef } from "react";
import { ImageSquareIcon, XIcon } from "@phosphor-icons/react";

import { ActionButton } from "../components/action-button";
import { usePanelWidthLimit } from "../hooks/use-panel-width-limit";
import { useViewSwitchMotion } from "../hooks/use-view-switch-motion";

import { AnimatedSidePanel } from "@/components/ui/animated-side-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { BasicAdjustmentsPanel } from "@/features/edit-panel/basic-adjustments/components/basic-adjustments-panel";
import { EditPanel } from "@/features/edit-panel/components/edit-panel";
import { Histogram } from "@/features/histogram/components/histogram";
import { InfoPanel } from "@/features/info-panel/components/info-panel";
import { useImageStore } from "@/store/image-store";
import { EDIT_PANEL_DEFAULT_WIDTH, useLayoutStore } from "@/store/layout-store";

const Adjustments = memo(function Adjustments({ active }: { active: boolean }) {
  const hasSelection = useImageStore((state) => state.selectedIndex !== null);
  const activeEditTab = useLayoutStore((state) => state.activeEditTab);

  if (activeEditTab !== "basic") return <EditPanel active={active} />;

  return (
    <div className="next-adjustments">
      <div className="next-histogram">
        <Histogram active={active && hasSelection} />
      </div>
      <div className="next-adjustment-content">
        {hasSelection ? (
          <BasicAdjustmentsPanel active={active} />
        ) : (
          <EmptyState
            compact
            className="h-full"
            graphic={<ImageSquareIcon size={28} />}
            title="No photo selected"
          />
        )}
      </div>
    </div>
  );
});

export const ContextPanel = memo(function ContextPanel() {
  const layout = useLayoutStore((state) => state.activeLayout);
  const info = useLayoutStore((state) => state.panels.infoPanel);
  const edit = useLayoutStore((state) => state.panels.editPanel);
  const hidden = useLayoutStore((state) => state.sidePanelsHidden);
  const togglePanel = useLayoutStore((state) => state.togglePanel);
  const width = usePanelWidthLimit(EDIT_PANEL_DEFAULT_WIDTH, 260);
  const motionEnabled = useViewSwitchMotion();
  const current = info ? "info" : layout === "detail" && edit ? "edit" : null;
  const last = useRef<"info" | "edit">("edit");

  if (current) last.current = current;

  const open = current !== null && !hidden && layout !== "inspector";

  return (
    <AnimatedSidePanel
      className="next-context-rail"
      motionEnabled={motionEnabled}
      open={open}
      side="right"
      width={width}
    >
      <aside
        aria-label={
          last.current === "info" ? "Photo information" : "Adjustments"
        }
        className="next-context-panel next-chrome"
      >
        <div className="next-panel-heading">
          <span>{last.current === "info" ? "Information" : "Adjustments"}</span>
          <div className="next-context-actions">
            <ActionButton
              label="Close panel"
              onPress={() =>
                togglePanel(last.current === "info" ? "infoPanel" : "editPanel")
              }
            >
              <XIcon size={14} />
            </ActionButton>
          </div>
        </div>
        <div className="next-context-content">
          {last.current === "info" ? (
            <InfoPanel active={open && current === "info"} />
          ) : (
            <Adjustments active={open && current === "edit"} />
          )}
        </div>
      </aside>
    </AnimatedSidePanel>
  );
});
