import { useEffect } from "react";
import { motion } from "framer-motion";
import { Allotment } from "allotment";

import { Filmstrip } from "@/features/gallery/filmstrip/filmstrip";
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
  rendererActive?: boolean;
};

export function InspectorLayout({
  rendererActive = true,
}: InspectorLayoutProps) {
  const selectedCheckpoint = useInspectionWorkspaceStore(
    (state) => state.selectedCheckpoint,
  );
  const clearCheckpoint = useInspectionWorkspaceStore(
    (state) => state.clearCheckpoint,
  );
  const { panels, filmstripHeight, setFilmstripHeight } = useLayoutStore();
  const files = useImageStore((state) => state.files);
  const selectedIndex = useImageStore((state) => state.selectedIndex);
  const selectedPath =
    selectedIndex !== null ? (files[selectedIndex]?.path ?? null) : null;

  useEffect(() => {
    clearCheckpoint();
  }, [clearCheckpoint, selectedPath]);

  return (
    <div className="h-full">
      <Allotment
        className="h-full allotment-shell"
        proportionalLayout={false}
        separator={false}
        vertical={false}
      >
        <Allotment.Pane minSize={MAIN_MIN_WIDTH}>
          <div className="h-full">
            <Allotment
              vertical
              proportionalLayout={false}
              separator={false}
              onDragEnd={(sizes) => {
                if (sizes[1] !== undefined) {
                  setFilmstripHeight(sizes[1]);
                }
              }}
            >
              <Allotment.Pane minSize={240}>
                <div className="relative h-full">
                  <InteractionViewport
                    rendererActive={rendererActive && !selectedCheckpoint}
                  />
                  {selectedCheckpoint ? (
                    <CheckpointReviewViewport checkpoint={selectedCheckpoint} />
                  ) : null}
                </div>
              </Allotment.Pane>
              <Allotment.Pane
                maxSize={FILMSTRIP_MAX_HEIGHT}
                minSize={FILMSTRIP_MIN_HEIGHT}
                preferredSize={filmstripHeight || FILMSTRIP_DEFAULT_HEIGHT}
              >
                <motion.div
                  animate={{
                    y: panels.filmstrip ? 0 : 12,
                    opacity: panels.filmstrip ? 1 : 0,
                  }}
                  className={
                    panels.filmstrip ? "h-full" : "h-full pointer-events-none"
                  }
                  initial={false}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <Filmstrip />
                </motion.div>
              </Allotment.Pane>
            </Allotment>
          </div>
        </Allotment.Pane>
        <Allotment.Pane
          maxSize={EDIT_PANEL_DEFAULT_WIDTH}
          minSize={EDIT_PANEL_DEFAULT_WIDTH}
          preferredSize={EDIT_PANEL_DEFAULT_WIDTH}
        >
          <InspectorPanel />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}
