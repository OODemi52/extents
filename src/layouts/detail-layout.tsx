import { motion } from "framer-motion";
import { Allotment } from "allotment";

import { EditPanel } from "@/features/edit-panel/components/edit-panel";
import { InfoPanel } from "@/features/info-panel/components/info-panel";
import { InteractionViewport } from "@/features/interaction-viewport/components/interaction-viewport";
import { Filmstrip } from "@/features/gallery/filmstrip/filmstrip";
import {
  EDIT_PANEL_DEFAULT_WIDTH,
  MAIN_MIN_WIDTH,
  FILMSTRIP_DEFAULT_HEIGHT,
  FILMSTRIP_MIN_HEIGHT,
  FILMSTRIP_MAX_HEIGHT,
  useLayoutStore,
} from "@/store/layout-store";

export function DetailLayout() {
  const { panels, filmstripHeight, setFilmstripHeight } = useLayoutStore();
  const isRightPanelOpen = panels.editPanel || panels.infoPanel;
  const showOverlayInfo = panels.editPanel && panels.infoPanel;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 relative">
        <div className="absolute inset-0 overflow-hidden">
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
                    <InteractionViewport />
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
                        panels.filmstrip
                          ? "h-full"
                          : "h-full pointer-events-none"
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

            {isRightPanelOpen && (
              <Allotment.Pane
                maxSize={EDIT_PANEL_DEFAULT_WIDTH}
                minSize={EDIT_PANEL_DEFAULT_WIDTH}
                preferredSize={EDIT_PANEL_DEFAULT_WIDTH}
              >
                <motion.div
                  key="right-panel-motion"
                  animate={{ x: 0, opacity: 1 }}
                  className="h-full pr-2"
                  initial={{ x: 20, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {panels.editPanel ? <EditPanel /> : null}
                </motion.div>
              </Allotment.Pane>
            )}
          </Allotment>
        </div>

        {panels.infoPanel ? (
          <motion.div
            animate={{
              opacity: 1,
              x: showOverlayInfo ? -16 : 0,
              y: 0,
              top: showOverlayInfo ? 12 : 0,
            }}
            className="absolute bottom-0 right-0 z-20 pr-2"
            initial={{ opacity: 0, x: -12, y: 12 }}
            style={{
              width: EDIT_PANEL_DEFAULT_WIDTH,
              top: 0,
            }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <InfoPanel />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
