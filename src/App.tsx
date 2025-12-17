import "allotment/dist/style.css";
import { useEffect } from "react";

import { useWGPURenderLoop } from "./hooks/use-wgpu-render-loop";
import { useAnnotations } from "./hooks/use-annotations";
import { ThumbnailGridLayout } from "./layouts/thumbnai-grid-layout";
import { EditorLayout } from "./layouts/editor-layout";
import { useLayoutStore } from "./store/layout-store";
import { clearRenderer } from "./services/api/renderer";

function App() {
  const { activeLayout } = useLayoutStore();

  useWGPURenderLoop();
  useAnnotations();

  useEffect(() => {
    void clearRenderer();
  }, [activeLayout]);

  return (
    <div className="flex h-screen flex-col">
      {activeLayout === "thumbnails" ? (
        <ThumbnailGridLayout />
      ) : (
        <EditorLayout />
      )}
    </div>
  );
}

export default App;
