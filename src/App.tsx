import "allotment/dist/style.css";
import { useWGPURenderLoop } from "./hooks/use-wgpu-render-loop";
import { useAnnotations } from "./hooks/use-annotations";
import { ThumbnailGridLayout } from "./layouts/thumbnai-grid-layout";
import { EditorLayout } from "./layouts/editor-layout";
import { useLayoutStore } from "./store/layout-store";
import { TitleBar } from "./components/title-bar";
import { useFolderScanner } from "./hooks/use-folder-scanner";

function App() {
  const { activeLayout } = useLayoutStore();
  const { openFolder } = useFolderScanner();

  useWGPURenderLoop();
  useAnnotations();

  return (
    <div
      className={`flex h-screen flex-col ${activeLayout === "thumbnails" ? "bg-[#191919]" : ""}`}
    >
      <TitleBar />
      <div className="relative flex-1 overflow-hidden">
        <div
          className={`absolute inset-0 ${
            activeLayout === "thumbnails"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <ThumbnailGridLayout openFolder={openFolder} />
        </div>
        <div
          className={`absolute inset-0 ${
            activeLayout === "editor"
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <EditorLayout openFolder={openFolder} />
        </div>
      </div>
    </div>
  );
}

export default App;
