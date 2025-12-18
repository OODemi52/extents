import { AnimatePresence, motion } from "framer-motion";
import { Allotment } from "allotment";

import { EditPanel } from "@/features/edit-panel/components/edit-panel";
import { InteractionViewport } from "@/features/interaction-viewport/components/interaction-viewport";
import { Filmstrip } from "@/features/gallery/filmstrip/filmstrip";
import {
  EDIT_PANEL_DEFAULT_WIDTH,
  MAIN_MIN_WIDTH,
  useLayoutStore,
} from "@/store/layout-store";

export function EditorLayout() {
  const { panels } = useLayoutStore();

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
            <div className="flex h-full flex-col">
              <div className="flex-1 overflow-hidden">
                <InteractionViewport />
              </div>
              <AnimatePresence>
                {panels.filmstrip && (
                  <motion.div
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    initial={{ y: 100, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <Filmstrip />
                  </motion.div>
                )}
              </AnimatePresence>
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
