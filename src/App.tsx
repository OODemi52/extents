import "allotment/dist/style.css";
import { useEffect } from "react";

import { useWGPURenderLoop } from "./hooks/use-wgpu-render-loop";
import { useAnnotations } from "./hooks/use-annotations";
import { ThumbnailGridLayout } from "./layouts/thumbnai-grid-layout";
import { EditorLayout } from "./layouts/editor-layout";
import { useLayoutStore } from "./store/layout-store";
import { TitleBar } from "./components/title-bar";
import { useFolderScanner } from "./hooks/use-folder-scanner";
import { clearRenderer } from "./services/api/renderer";

function App() {
  const { activeLayout } = useLayoutStore();
  const { openFolder } = useFolderScanner();

  useWGPURenderLoop();
  useAnnotations();

  useEffect(() => {
    if (activeLayout === "thumbnails") {
      void clearRenderer();
    }
  }, [activeLayout]);

  return (
    <div className="flex h-screen flex-col">
      <TitleBar />
      <div className="flex-1 overflow-hidden">
        <div
          className={activeLayout === "thumbnails" ? "block h-full" : "hidden"}
        >
          <ThumbnailGridLayout openFolder={openFolder} />
        </div>
        <div className={activeLayout === "editor" ? "block h-full" : "hidden"}>
          <EditorLayout openFolder={openFolder} />
        </div>
      </div>
    </div>
  );
}

export default App;
