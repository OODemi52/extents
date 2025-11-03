import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import { Sidebar } from "./components/sidebar";
import { Filmstrip } from "./features/thumbnails/components/filmstrip";
import { ImageViewer } from "./components/image-viewer";
import { EditPanel } from "./components/edit-panel";
import { BottomToolbar } from "./components/bottom-toolbar";
import { useFolderScanner } from "./hooks/use-folder-scanner";
import { useWGPURenderLoop } from "./hooks/use-wgpu-render-loop";
import { useImageStore } from "./store/image-store";
import { useLayoutStore } from "./store/layout-store";

function App() {
  const { fileMetadataList } = useImageStore();
  const { openFolder } = useFolderScanner();
  const {
    panels,
    sidebarWidth,
    editPanelWidth,
    setSidebarWidth,
    setEditPanelWidth,
  } = useLayoutStore();

  // WGPU render loop (handles frame rendering and window focus)
  useWGPURenderLoop();

  return (
    <div className="flex flex-col h-screen">
      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Sidebar Panel */}
          {panels.sidebar && (
            <>
              <Panel
                defaultSize={sidebarWidth}
                maxSize={30}
                minSize={10}
                onResize={(size) => setSidebarWidth(size)}
              >
                <Sidebar
                  hasImages={fileMetadataList.length > 0}
                  onPickFolder={openFolder}
                />
              </Panel>
              <PanelResizeHandle className="w-1 bg-transparent hover:bg-blue-500/50 transition-colors" />
            </>
          )}

          {/* Center: Viewer + Filmstrip */}
          <Panel minSize={30}>
            <div className="flex flex-col h-full">
              <ImageViewer />
              {panels.filmstrip && <Filmstrip />}
            </div>
          </Panel>

          {/* Edit Panel */}
          {panels.editPanel && (
            <>
              <PanelResizeHandle className="w-1 bg-transparent hover:bg-blue-500/50 transition-colors" />
              <Panel
                defaultSize={editPanelWidth}
                maxSize={40}
                minSize={15}
                onResize={(size) => setEditPanelWidth(size)}
              >
                <EditPanel />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {/* Bottom Toolbar */}
      <BottomToolbar />
    </div>
  );
}

export default App;
