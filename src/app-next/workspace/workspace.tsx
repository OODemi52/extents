import { lazy, memo, Suspense, useRef } from "react";

import { AnimatedFilmstripPanel } from "@/components/ui/animated-filmstrip-panel";
import { Filmstrip } from "@/features/gallery/filmstrip/filmstrip";
import { Grid } from "@/features/gallery/grid/grid";
import { InteractionViewport } from "@/features/interaction-viewport/components/interaction-viewport";
import { useFilteredImages } from "@/features/filter/hooks/use-filtered-files";
import {
  FILMSTRIP_DEFAULT_HEIGHT,
  FILMSTRIP_MAX_HEIGHT,
  FILMSTRIP_MIN_HEIGHT,
  useLayoutStore,
} from "@/store/layout-store";

const InspectorLayout = lazy(() =>
  import("@/layouts/inspector-layout").then((module) => ({
    default: module.InspectorLayout,
  })),
);

export const PhotoWorkspace = memo(function PhotoWorkspace({
  onPickFolder,
}: {
  onPickFolder: () => void;
}) {
  const layout = useLayoutStore((state) => state.activeLayout);
  const filmstripVisible = useLayoutStore((state) => state.panels.filmstrip);
  const filmstripHeight = useLayoutStore((state) => state.filmstripHeight);
  const setFilmstripHeight = useLayoutStore(
    (state) => state.setFilmstripHeight,
  );
  const hasItems = useFilteredImages().length > 0;
  const inspector = layout === "inspector";
  const grid = layout === "grid";
  const open = filmstripVisible && hasItems && !inspector;
  const retainedOpenRef = useRef(false);

  if (open) retainedOpenRef.current = true;

  return (
    <div className="next-photo-workspace">
      <div className="next-photo-surface">
        <div
          aria-hidden={!grid}
          className="next-view-layer next-grid-layer"
          data-visible={grid || undefined}
          inert={!grid || undefined}
        >
          <Grid active={grid} onPickFolder={onPickFolder} />
        </div>
        <div
          aria-hidden={grid || inspector}
          className="next-view-layer next-detail-layer"
          data-visible={(!grid && !inspector) || undefined}
          inert={grid || inspector || undefined}
        >
          <InteractionViewport
            rendererActive={!grid && !inspector}
            onPickFolder={onPickFolder}
          />
        </div>
        {inspector ? (
          <div data-visible className="next-view-layer">
            <Suspense fallback={null}>
              <InspectorLayout rendererActive onPickFolder={onPickFolder} />
            </Suspense>
          </div>
        ) : null}
      </div>
      <AnimatedFilmstripPanel
        className="next-filmstrip"
        height={filmstripHeight || FILMSTRIP_DEFAULT_HEIGHT}
        maxHeight={FILMSTRIP_MAX_HEIGHT}
        minHeight={FILMSTRIP_MIN_HEIGHT}
        open={open}
        onHeightCommit={setFilmstripHeight}
      >
        {(height) =>
          retainedOpenRef.current && hasItems ? (
            <Filmstrip height={height} />
          ) : null
        }
      </AnimatedFilmstripPanel>
    </div>
  );
});
