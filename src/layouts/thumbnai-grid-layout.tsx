import { motion } from "framer-motion";
import { Allotment } from "allotment";

import { Sidebar } from "@/components/sidebar";
import { BottomToolbar } from "@/components/bottom-toolbar";
import { ThumbnailGrid } from "@/features/gallery/grid/grid";
import { useImageStore } from "@/store/image-store";
import {
  MAIN_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  useLayoutStore,
} from "@/store/layout-store";

type GridLayoutProps = {
  openFolder: () => void;
};

export function ThumbnailGridLayout({ openFolder }: GridLayoutProps) {
  const { fileMetadataList } = useImageStore();
  const { panels, sidebarWidth, setSidebarWidth } = useLayoutStore();

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden py-2">
        <Allotment
          className="h-full allotment-shell"
          proportionalLayout={false}
          separator={false}
          vertical={false}
          onChange={(sizes) => {
            if (panels.sidebar && sizes[0]) {
              setSidebarWidth(sizes[0]);
            }
          }}
        >
          {panels.sidebar && (
            <Allotment.Pane
              snap
              maxSize={SIDEBAR_MAX_WIDTH}
              minSize={SIDEBAR_MIN_WIDTH}
              preferredSize={sidebarWidth}
            >
              <motion.div
                key="sidebar-panel-motion"
                animate={{ x: 0, opacity: 1 }}
                className="h-full pl-2"
                initial={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Sidebar
                  hasImages={fileMetadataList.length > 0}
                  onPickFolder={openFolder}
                />
              </motion.div>
            </Allotment.Pane>
          )}

          <Allotment.Pane minSize={MAIN_MIN_WIDTH}>
            <div className="h-full">
              <ThumbnailGrid />
            </div>
          </Allotment.Pane>
        </Allotment>
      </div>

      <BottomToolbar />
    </div>
  );
}
