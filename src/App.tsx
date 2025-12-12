import "allotment/dist/style.css";
import { useWGPURenderLoop } from "./hooks/use-wgpu-render-loop";
import { EditorLayout, ThumbnailLayout } from "./layouts";
import { useLayoutStore } from "./store/layout-store";

function App() {
  const { activeLayout } = useLayoutStore();

  useWGPURenderLoop();

  return (
    <div className="flex h-screen flex-col">
      {activeLayout === "thumbnails" ? <ThumbnailLayout /> : <EditorLayout />}
    </div>
  );
}

export default App;
