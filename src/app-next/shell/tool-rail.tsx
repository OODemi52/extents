import { memo } from "react";
import { InfoIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { motion } from "framer-motion";

import { ActionButton } from "../components/action-button";
import { useViewSwitchMotion } from "../hooks/use-view-switch-motion";

import { useLayoutStore } from "@/store/layout-store";

const dockTransition = { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const };

export const ToolRail = memo(function ToolRail() {
  const layout = useLayoutStore((state) => state.activeLayout);
  const motionEnabled = useViewSwitchMotion();
  const editOpen = useLayoutStore(
    (state) =>
      state.panels.editPanel &&
      !state.panels.infoPanel &&
      !state.sidePanelsHidden,
  );
  const infoOpen = useLayoutStore(
    (state) => state.panels.infoPanel && !state.sidePanelsHidden,
  );
  const togglePanel = useLayoutStore((state) => state.togglePanel);
  const panelOpen =
    layout !== "inspector" && (infoOpen || (layout === "detail" && editOpen));

  return (
    <nav
      aria-label="Photo tools"
      className="next-tool-rail next-chrome"
      data-panel-open={panelOpen || undefined}
    >
      {layout === "detail" ? (
        <motion.div
          className="next-tool-target next-tool-target-edit"
          layout={motionEnabled ? "position" : false}
          transition={dockTransition}
        >
          <ActionButton
            active={editOpen}
            label="Adjustments"
            shortcut="E"
            onPress={() => togglePanel("editPanel")}
          >
            <SlidersHorizontalIcon size={20} />
          </ActionButton>
        </motion.div>
      ) : null}
      {layout !== "inspector" ? (
        <motion.div
          className="next-tool-target next-tool-target-info"
          layout={motionEnabled ? "position" : false}
          transition={dockTransition}
        >
          <ActionButton
            active={infoOpen}
            label="Photo information"
            shortcut="I"
            onPress={() => togglePanel("infoPanel")}
          >
            <InfoIcon size={20} />
          </ActionButton>
        </motion.div>
      ) : null}
    </nav>
  );
});
