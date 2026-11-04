import { lazy, Suspense, useCallback, useEffect } from "react";
import { MotionConfig } from "framer-motion";

import { SHELL_VARIANT } from "./experiment";
import { ShellTitleBar } from "./shell/title-bar";
import { StatusBar } from "./shell/status-bar";
import { ToolRail } from "./shell/tool-rail";
import { LibraryPanel } from "./panels/library-panel";
import { ContextPanel } from "./panels/context-panel";
import { PhotoWorkspace } from "./workspace/workspace";

import { ApplicationEffects } from "@/components/application-effects";
import { useFolderScanner } from "@/hooks/use-folder-scanner";
import { useInspectionWorkspaceStore } from "@/features/inspector/store/inspection-workspace-store";
import { useLayoutStore } from "@/store/layout-store";
import { useSettingsStore } from "@/features/settings/stores/settings-store";
import { api } from "@/services/api";

import "./styles/shell.css";

const SettingsModal = lazy(() =>
  import("@/features/settings/components/settings-modal").then((module) => ({
    default: module.SettingsModal,
  })),
);

export default function NextApp() {
  const layout = useLayoutStore((state) => state.activeLayout);
  const inspectorEnabled = useLayoutStore((state) => state.inspectorEnabled);
  const setLayout = useLayoutStore((state) => state.setActiveLayout);
  const checkpointSelected = useInspectionWorkspaceStore((state) =>
    Boolean(state.selectedCheckpoint),
  );
  const settingsOpen = useSettingsStore((state) => state.isSettingsModalOpen);
  const { openFolder } = useFolderScanner();
  const pickFolder = useCallback(() => {
    void openFolder(null, "picker");
  }, [openFolder]);
  const suspendRenderer =
    layout === "grid" || (layout === "inspector" && checkpointSelected);

  useEffect(() => {
    if (layout === "compare" || (layout === "inspector" && !inspectorEnabled))
      setLayout("detail");
  }, [inspectorEnabled, layout, setLayout]);

  useEffect(() => {
    if (!suspendRenderer) return;

    void api.renderer
      .suspendPresentation()
      .catch((error) => console.error("Unable to suspend renderer:", error));
  }, [suspendRenderer]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="next-app" data-shell={SHELL_VARIANT} data-view={layout}>
        <ApplicationEffects />
        <ShellTitleBar onPickFolder={pickFolder} />
        <div className="next-shell-body">
          <LibraryPanel onPickFolder={pickFolder} />
          <main aria-label="Photographic workspace" className="next-main">
            <PhotoWorkspace onPickFolder={pickFolder} />
            <div aria-hidden="true" className="next-viewport-corners">
              <span />
              <span />
              <span />
              <span />
            </div>
          </main>
          <ContextPanel />
          <ToolRail />
        </div>
        <StatusBar />
        {settingsOpen ? (
          <Suspense fallback={null}>
            <SettingsModal />
          </Suspense>
        ) : null}
      </div>
    </MotionConfig>
  );
}
