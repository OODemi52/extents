import "allotment/dist/style.css";
import { Allotment } from "allotment";
import { motion } from "framer-motion";
import { useRef } from "react";

import { ThumbnailGridLayout } from "./layouts/thumbnai-grid-layout";
import { EditorLayout } from "./layouts/editor-layout";
import { Sidebar } from "./components/sidebar";
import { BottomToolbar } from "./components/bottom-toolbar";
import {
  MAIN_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  useLayoutStore,
} from "./store/layout-store";
import { TitleBar } from "./components/title-bar";
import { useFolderScanner } from "./hooks/use-folder-scanner";
import { useImageStore } from "./store/image-store";

function App() {
  const { activeLayout, panels, sidebarWidth, setSidebarWidth } =
    useLayoutStore();
  const { fileMetadataList } = useImageStore();
  const { openFolder } = useFolderScanner();
  const lastSidebarWidthRef = useRef(sidebarWidth);
  const isSidebarOpen = panels.sidebar;
  const sidebarPreferredSize =
    lastSidebarWidthRef.current || SIDEBAR_DEFAULT_WIDTH;
  const sidebarMinSize = SIDEBAR_MIN_WIDTH;

  return (
    <div
      className={`flex h-screen flex-col ${activeLayout === "thumbnails" ? "bg-[#191919]" : ""}`}
    >
      <TitleBar />
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          <div className="flex flex-1 overflow-hidden py-2">
            <Allotment
              className="h-full allotment-shell"
              proportionalLayout={false}
              separator={false}
              vertical={false}
              onChange={(sizes) => {
                if (
                  panels.sidebar &&
                  typeof sizes[0] === "number" &&
                  sizes[0] > 0
                ) {
                  lastSidebarWidthRef.current = sizes[0];
                  setSidebarWidth(sizes[0]);
                }
              }}
            >
              <Allotment.Pane
                snap
                maxSize={SIDEBAR_MAX_WIDTH}
                minSize={sidebarMinSize}
                preferredSize={sidebarPreferredSize}
                visible={isSidebarOpen}
              >
                <motion.div
                  key="sidebar-panel-motion"
                  animate={{
                    x: isSidebarOpen ? 0 : -20,
                    opacity: isSidebarOpen ? 1 : 0,
                  }}
                  className={`h-full pl-2 ${isSidebarOpen ? "pointer-events-auto" : "pointer-events-none"}`}
                  initial={false}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <Sidebar
                    hasImages={fileMetadataList.length > 0}
                    onPickFolder={openFolder}
                  />
                </motion.div>
              </Allotment.Pane>

              <Allotment.Pane minSize={MAIN_MIN_WIDTH}>
                <div className="relative h-full">
                  <div
                    className={`absolute inset-0 ${
                      activeLayout === "thumbnails"
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <ThumbnailGridLayout />
                  </div>
                  <div
                    className={`absolute inset-0 ${
                      activeLayout === "editor"
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <EditorLayout />
                  </div>
                </div>
              </Allotment.Pane>
            </Allotment>
          </div>
          <BottomToolbar />
        </div>
      </div>
    </div>
  );
}

export default App;
