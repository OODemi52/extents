import { memo } from "react";

import { AnimatedSidePanel } from "@/components/ui/animated-side-panel";
import { Grid } from "@/features/gallery/grid/grid";
import { InfoPanel } from "@/features/info-panel/components/info-panel";
import {
  EDIT_PANEL_DEFAULT_WIDTH,
  MAIN_MIN_WIDTH,
  useLayoutStore,
} from "@/store/layout-store";

type GridLayoutProps = {
  layoutActive?: boolean;
  onPickFolder?: () => void;
};

export const GridLayout = memo(function GridLayout({
  layoutActive = true,
  onPickFolder,
}: GridLayoutProps) {
  const infoPanelVisible = useLayoutStore((state) => state.panels.infoPanel);
  const sidePanelsHidden = useLayoutStore((state) => state.sidePanelsHidden);
  const isInfoPanelOpen = layoutActive && infoPanelVisible && !sidePanelsHidden;

  return (
    <div className="flex h-full overflow-hidden">
      <div
        className="h-full min-w-0 flex-1 overflow-hidden"
        style={{ minWidth: MAIN_MIN_WIDTH }}
      >
        <Grid active={layoutActive} onPickFolder={onPickFolder} />
      </div>
      <AnimatedSidePanel
        contentClassName="pr-2"
        motionEnabled={layoutActive}
        open={isInfoPanelOpen}
        side="right"
        width={EDIT_PANEL_DEFAULT_WIDTH}
      >
        <InfoPanel active={isInfoPanelOpen} />
      </AnimatedSidePanel>
    </div>
  );
});
