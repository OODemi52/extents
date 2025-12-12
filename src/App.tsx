import "allotment/dist/style.css";
import { useWGPURenderLoop } from "./hooks/use-wgpu-render-loop";
import { ThumbnailGridLayout } from "./layouts/thumbnai-grid-layout";
import { EditorLayout } from "./layouts/editor-layout";
import { useLayoutStore } from "./store/layout-store";

function App() {
  const { activeLayout } = useLayoutStore();

  useWGPURenderLoop();

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
