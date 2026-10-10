import { memo, useEffect } from "react";

import { AnimatedFilmstripPanel } from "@/components/ui/animated-filmstrip-panel";
import { AnimatedSidePanel } from "@/components/ui/animated-side-panel";
import { Filmstrip } from "@/features/gallery/filmstrip/filmstrip";
import { useFilteredImages } from "@/features/filter/hooks/use-filtered-files";
import { CheckpointReviewViewport } from "@/features/inspector/components/checkpoints/checkpoint-review-viewport";
import { InspectorPanel } from "@/features/inspector/components/inspector-panel";
import { useInspectionWorkspaceStore } from "@/features/inspector/store/inspection-workspace-store";
import { InteractionViewport } from "@/features/interaction-viewport/components/interaction-viewport";
import {
  EDIT_PANEL_DEFAULT_WIDTH,
  FILMSTRIP_DEFAULT_HEIGHT,
  FILMSTRIP_MAX_HEIGHT,
  FILMSTRIP_MIN_HEIGHT,
  MAIN_MIN_WIDTH,
  useLayoutStore,
} from "@/store/layout-store";
import { useImageStore } from "@/store/image-store";

type InspectorLayoutProps = {
  onPickFolder?: () => void;
  rendererActive?: boolean;
};

export const InspectorLayout = memo(function InspectorLayout({
  onPickFolder,
  rendererActive = true,
}: InspectorLayoutProps) {
  const selectedCheckpoint = useInspectionWorkspaceStore(
    (state) => state.selectedCheckpoint,
  );
  const clearCheckpoint = useInspectionWorkspaceStore(
    (state) => state.clearCheckpoint,
  );
  const selectedPath = useImageStore((state) =>
    rendererActive && state.selectedIndex !== null
      ? (state.files[state.selectedIndex]?.path ?? null)
      : null,
  );
  const filmstripVisible = useLayoutStore((state) => state.panels.filmstrip);
  const sidePanelsHidden = useLayoutStore((state) => state.sidePanelsHidden);
  const filmstripHeight = useLayoutStore((state) => state.filmstripHeight);
  const setFilmstripHeight = useLayoutStore(
    (state) => state.setFilmstripHeight,
  );
  const filteredFiles = useFilteredImages(rendererActive);
  const isFilmstripVisible = filmstripVisible && filteredFiles.length > 0;
  const isFilmstripOpen = rendererActive && isFilmstripVisible;
  const isInspectorPanelOpen = rendererActive && !sidePanelsHidden;

  useEffect(() => {
    if (!rendererActive) return;

    clearCheckpoint();
  }, [clearCheckpoint, rendererActive, selectedPath]);

  return (
    <div className="flex h-full overflow-hidden">
      <div
        className="h-full min-w-0 flex-1 overflow-hidden"
        style={{ minWidth: MAIN_MIN_WIDTH }}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="relative min-h-[240px] flex-1 overflow-hidden">
            <div className="relative h-full">
              <InteractionViewport
                rendererActive={rendererActive && !selectedCheckpoint}
                onPickFolder={onPickFolder}
              />
              {selectedCheckpoint ? (
                <CheckpointReviewViewport checkpoint={selectedCheckpoint} />
              ) : null}
            </div>
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
              rendererActive && filteredFiles.length > 0 ? (
                <Filmstrip height={height} />
              ) : null
            }
          </AnimatedFilmstripPanel>
        </div>
      </div>
      <AnimatedSidePanel
        motionEnabled={rendererActive}
        open={isInspectorPanelOpen}
        side="right"
        width={EDIT_PANEL_DEFAULT_WIDTH}
      >
        <InspectorPanel active={isInspectorPanelOpen} />
      </AnimatedSidePanel>
    </div>
  );
});
