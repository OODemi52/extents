import { motion } from "framer-motion";
import { Allotment } from "allotment";

import { EditPanel } from "@/features/edit-panel/components/edit-panel";
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

export function EditorLayout() {
  const { panels, filmstripHeight, setFilmstripHeight } = useLayoutStore();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <Allotment
          className="h-full allotment-shell"
          proportionalLayout={false}
          separator={false}
          vertical={false}
        >
          <Allotment.Pane minSize={MAIN_MIN_WIDTH}>
            <div className="h-full">
              {panels.filmstrip ? (
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
                      animate={{ y: 0, opacity: 1 }}
                      className="h-full"
                      exit={{ y: 40, opacity: 0 }}
                      initial={{ y: 40, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <Filmstrip />
                    </motion.div>
                  </Allotment.Pane>
                </Allotment>
              ) : (
                <InteractionViewport />
              )}
            </div>
          </Allotment.Pane>

          {panels.editPanel && (
            <Allotment.Pane
              maxSize={EDIT_PANEL_DEFAULT_WIDTH}
              minSize={EDIT_PANEL_DEFAULT_WIDTH}
              preferredSize={EDIT_PANEL_DEFAULT_WIDTH}
            >
              <motion.div
                key="edit-panel-motion"
                animate={{ x: 0, opacity: 1 }}
                className="h-full pr-2"
                initial={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <EditPanel />
              </motion.div>
            </Allotment.Pane>
          )}
        </Allotment>
      </div>
    </div>
  );
}
