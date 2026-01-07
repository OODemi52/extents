import "allotment/dist/style.css";
import { Allotment } from "allotment";
import { motion } from "framer-motion";
import { useRef } from "react";

import { ThumbnailGridLayout } from "./layouts/thumbnai-grid-layout";
import { DetailLayout } from "./layouts/detail-layout";
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
import { useAnnotations } from "./hooks/use-annotations";
import { useExifMetadata } from "./hooks/use-exif-metadata";
import { SettingsModal } from "./features/settings/components/settings-modal";
import { useCacheSize } from "./features/settings/hooks/use-cache-size";

function App() {
  useAnnotations();
  useExifMetadata();
  useCacheSize();

  const {
    activeLayout,
    panels,
    sidebarWidth,
    setSidebarWidth,
    setSidebarResizing,
  } = useLayoutStore();
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
      <TitleBar onPickFolder={() => openFolder(null, "picker")} />
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
                }
              }}
              onDragEnd={(sizes) => {
                if (
                  panels.sidebar &&
                  typeof sizes[0] === "number" &&
                  sizes[0] > 0
                ) {
                  lastSidebarWidthRef.current = sizes[0];
                  setSidebarWidth(sizes[0]);
                }
                setSidebarResizing(false);
              }}
              onDragStart={() => setSidebarResizing(true)}
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
                  <Sidebar />
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
                      activeLayout === "detail"
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <DetailLayout />
                  </div>
                </div>
              </Allotment.Pane>
            </Allotment>
          </div>
          <BottomToolbar />
        </div>
      </div>
      <SettingsModal />
    </div>
  );
}

export default App;
