import { AnimatePresence, motion } from "framer-motion";
import { Allotment } from "allotment";

import { Sidebar } from "@/components/sidebar";
import { BottomToolbar } from "@/components/bottom-toolbar";
import { EditPanel } from "@/features/edit-panel/components/edit-panel";
import { InteractionViewport } from "@/features/interaction-viewport/components/interaction-viewport";
import { Filmstrip } from "@/features/thumbnails/components/filmstrip";
import { useFolderScanner } from "@/hooks/use-folder-scanner";
import { useImageStore } from "@/store/image-store";
import {
  EDIT_PANEL_DEFAULT_WIDTH,
  MAIN_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  useLayoutStore,
} from "@/store/layout-store";

export function EditorLayout() {
  const { fileMetadataList } = useImageStore();
  const { openFolder } = useFolderScanner();
  const { panels, sidebarWidth, setSidebarWidth } = useLayoutStore();

  return (
    <div className="flex flex-col h-full">
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
            <div className="flex flex-col h-full">
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

      <BottomToolbar />
    </div>
  );
}
