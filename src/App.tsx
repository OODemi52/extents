import { useCallback, useEffect } from "react";

import { GridLayout } from "./layouts/grid-layout";
import { DetailLayout } from "./layouts/detail-layout";
import { InspectorLayout } from "./layouts/inspector-layout";
import { BottomToolbar } from "./components/bottom-toolbar";
import { MAIN_MIN_WIDTH, useLayoutStore } from "./store/layout-store";
import { TitleBar } from "./components/title-bar";
import { useFolderScanner } from "./hooks/use-folder-scanner";
import { SettingsModal } from "./features/settings/components/settings-modal";
import { useInspectionWorkspaceStore } from "./features/inspector/store/inspection-workspace-store";
import { api } from "./services/api";
import { ApplicationEffects } from "./components/application-effects";
import { SidebarRail } from "./components/sidebar-rail";

function App() {
  const activeLayout = useLayoutStore((state) => state.activeLayout);
  const inspectorEnabled = useLayoutStore((state) => state.inspectorEnabled);
  const setActiveLayout = useLayoutStore((state) => state.setActiveLayout);
  const selectedCheckpoint = useInspectionWorkspaceStore(
    (state) => state.selectedCheckpoint,
  );
  const { openFolder } = useFolderScanner();
  const handlePickFolder = useCallback(() => {
    void openFolder(null, "picker");
  }, [openFolder]);
  const isGridLayoutActive = activeLayout === "grid";
  const isDetailLayoutActive = activeLayout === "detail";
  const isInspectorLayoutActive =
    activeLayout === "inspector" && inspectorEnabled;
  const useOpaqueAppBackground =
    isGridLayoutActive ||
    (activeLayout === "inspector" && Boolean(selectedCheckpoint));
  const shouldSuspendRenderer =
    !isDetailLayoutActive && !(isInspectorLayoutActive && !selectedCheckpoint);

  useEffect(() => {
    if (!inspectorEnabled && activeLayout === "inspector") {
      setActiveLayout("detail");
    }
  }, [activeLayout, inspectorEnabled, setActiveLayout]);

  useEffect(() => {
    if (!shouldSuspendRenderer) return;

    void api.renderer.suspendPresentation().catch((error) => {
      console.error("Failed to suspend renderer presentation:", error);
    });
  }, [shouldSuspendRenderer]);

  return (
    <div
      className={`flex h-screen flex-col shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] ${useOpaqueAppBackground ? "bg-[#191919]" : ""}`}
    >
      <div className="pointer-events-none w-10/12 mx-auto absolute inset-x-0 top-0 z-20 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.1),rgba(255,255,255,0))]" />
      <ApplicationEffects />
      <TitleBar onPickFolder={handlePickFolder} />
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          <div className="flex flex-1 overflow-hidden py-2">
            <div className="flex h-full w-full overflow-hidden">
              <SidebarRail />

              <div
                className="relative h-full min-w-0 flex-1"
                style={{ minWidth: MAIN_MIN_WIDTH }}
              >
                <div
                  aria-hidden={!isGridLayoutActive}
                  className={`absolute inset-0 ${
                    isGridLayoutActive
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none"
                  }`}
                  inert={!isGridLayoutActive || undefined}
                >
                  <GridLayout
                    layoutActive={isGridLayoutActive}
                    onPickFolder={handlePickFolder}
                  />
                </div>
                <div
                  aria-hidden={!isDetailLayoutActive}
                  className={`absolute inset-0 ${
                    isDetailLayoutActive
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none"
                  }`}
                  inert={!isDetailLayoutActive || undefined}
                >
                  <DetailLayout
                    rendererActive={isDetailLayoutActive}
                    onPickFolder={handlePickFolder}
                  />
                </div>
                <div
                  aria-hidden={!isInspectorLayoutActive}
                  className={`absolute inset-0 ${
                    isInspectorLayoutActive
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none"
                  }`}
                  inert={!isInspectorLayoutActive || undefined}
                >
                  {inspectorEnabled ? (
                    <InspectorLayout
                      rendererActive={isInspectorLayoutActive}
                      onPickFolder={handlePickFolder}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <BottomToolbar />
        </div>
      </div>
      <SettingsModal />
    </div>
  );
}

export default App;
