import { memo, useRef } from "react";

import { AnimatedFilmstripPanel } from "@/components/ui/animated-filmstrip-panel";
import { AnimatedSidePanel } from "@/components/ui/animated-side-panel";
import { EditPanel } from "@/features/edit-panel/components/edit-panel";
import { InfoPanel } from "@/features/info-panel/components/info-panel";
import { InteractionViewport } from "@/features/interaction-viewport/components/interaction-viewport";
import { Filmstrip } from "@/features/gallery/filmstrip/filmstrip";
import { useFilteredImages } from "@/features/filter/hooks/use-filtered-files";
import {
  EDIT_PANEL_DEFAULT_WIDTH,
  FILMSTRIP_DEFAULT_HEIGHT,
  FILMSTRIP_MAX_HEIGHT,
  FILMSTRIP_MIN_HEIGHT,
  MAIN_MIN_WIDTH,
  useLayoutStore,
} from "@/store/layout-store";

type DetailLayoutProps = {
  onPickFolder?: () => void;
  rendererActive?: boolean;
};

export const DetailLayout = memo(function DetailLayout({
  onPickFolder,
  rendererActive = true,
}: DetailLayoutProps) {
  const infoPanelVisible = useLayoutStore((state) => state.panels.infoPanel);
  const editPanelVisible = useLayoutStore((state) => state.panels.editPanel);
  const filmstripVisible = useLayoutStore((state) => state.panels.filmstrip);
  const sidePanelsHidden = useLayoutStore((state) => state.sidePanelsHidden);
  const filmstripHeight = useLayoutStore((state) => state.filmstripHeight);
  const setFilmstripHeight = useLayoutStore(
    (state) => state.setFilmstripHeight,
  );
  const hasFilmstripItems = useFilteredImages(rendererActive).length > 0;
  const activeRightPanel = infoPanelVisible
    ? "info"
    : editPanelVisible
      ? "edit"
      : null;
  const isRightPanelOpen =
    rendererActive && activeRightPanel !== null && !sidePanelsHidden;
  const lastActiveRightPanelRef = useRef<"edit" | "info">("edit");

  if (activeRightPanel) {
    lastActiveRightPanelRef.current = activeRightPanel;
  }

  const isFilmstripVisible = filmstripVisible && hasFilmstripItems;
  const isFilmstripOpen = rendererActive && isFilmstripVisible;

  return (
    <div className="flex h-full overflow-hidden">
      <div
        className="relative h-full min-w-0 flex-1 overflow-hidden"
        style={{ minWidth: MAIN_MIN_WIDTH }}
      >
        <div className="absolute inset-0 flex min-h-0 flex-col">
          <div className="relative min-h-[240px] flex-1 overflow-hidden">
            <InteractionViewport
              rendererActive={rendererActive}
              onPickFolder={onPickFolder}
            />
          </div>
          <AnimatedFilmstripPanel
            height={filmstripHeight || FILMSTRIP_DEFAULT_HEIGHT}
            maxHeight={FILMSTRIP_MAX_HEIGHT}
            minHeight={FILMSTRIP_MIN_HEIGHT}
            motionEnabled={rendererActive}
            open={isFilmstripOpen}
            onHeightCommit={setFilmstripHeight}
          >
            {(height) =>
              rendererActive && hasFilmstripItems ? (
                <Filmstrip height={height} />
              ) : null
            }
          </AnimatedFilmstripPanel>
        </div>
      </div>
      <AnimatedSidePanel
        contentClassName="pr-2"
        motionEnabled={rendererActive}
        open={isRightPanelOpen}
        side="right"
        width={EDIT_PANEL_DEFAULT_WIDTH}
      >
        {lastActiveRightPanelRef.current === "info" ? (
          <InfoPanel active={isRightPanelOpen && activeRightPanel === "info"} />
        ) : (
          <EditPanel active={isRightPanelOpen && activeRightPanel === "edit"} />
        )}
      </AnimatedSidePanel>
    </div>
  );
});
