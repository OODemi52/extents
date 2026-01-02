import { motion } from "framer-motion";
import { Allotment } from "allotment";

import { ThumbnailGrid } from "@/features/gallery/grid/grid";
import { InfoPanel } from "@/features/info-panel/components/info-panel";
import {
  EDIT_PANEL_DEFAULT_WIDTH,
  MAIN_MIN_WIDTH,
  useLayoutStore,
} from "@/store/layout-store";

export function ThumbnailGridLayout() {
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
            <ThumbnailGrid />
          </Allotment.Pane>
          {panels.infoPanel ? (
            <Allotment.Pane
              maxSize={EDIT_PANEL_DEFAULT_WIDTH}
              minSize={EDIT_PANEL_DEFAULT_WIDTH}
              preferredSize={EDIT_PANEL_DEFAULT_WIDTH}
            >
              <motion.div
                key="info-panel-motion"
                animate={{ x: 0, opacity: 1 }}
                className="h-full pr-2"
                initial={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <InfoPanel />
              </motion.div>
            </Allotment.Pane>
          ) : null}
        </Allotment>
      </div>
    </div>
  );
}
