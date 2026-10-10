import { memo } from "react";
import { Button } from "@heroui/react";
import { FolderOpenIcon, SidebarSimpleIcon } from "@phosphor-icons/react";

import { ActionButton } from "../components/action-button";
import { usePanelResize } from "../hooks/use-panel-resize";

import { AnimatedSidePanel } from "@/components/ui/animated-side-panel";
import { FileTree } from "@/features/file-browser/components/file-tree";
import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  useLayoutStore,
} from "@/store/layout-store";

export const LibraryPanel = memo(function LibraryPanel({
  onPickFolder,
}: {
  onPickFolder: () => void;
}) {
  const open = useLayoutStore(
    (state) => state.panels.sidebar && !state.sidePanelsHidden,
  );
  const width = useLayoutStore((state) => state.sidebarWidth);
  const setWidth = useLayoutStore((state) => state.setSidebarWidth);
  const togglePanel = useLayoutStore((state) => state.togglePanel);
  const { liveWidth, resizing, separatorProps } = usePanelResize({
    width,
    min: Math.max(190, SIDEBAR_MIN_WIDTH),
    max: SIDEBAR_MAX_WIDTH,
    side: "left",
    onCommit: setWidth,
  });

  return (
    <AnimatedSidePanel
      className="next-library-rail"
      motionEnabled={!resizing}
      open={open}
      side="left"
      width={liveWidth}
    >
      <aside aria-label="Photo library" className="next-library next-chrome">
        <div className="next-panel-heading">
          <span>Library</span>
          <ActionButton
            label="Hide library"
            onPress={() => togglePanel("sidebar")}
          >
            <SidebarSimpleIcon size={16} />
          </ActionButton>
        </div>
        <Button
          className="next-open-folder"
          size="sm"
          variant="ghost"
          onPress={onPickFolder}
        >
          <FolderOpenIcon size={17} />
          <span>Open folder</span>
          <span className="next-open-folder-shortcut">+</span>
        </Button>
        <div className="next-library-section-title">Folders</div>
        <div className="next-library-tree">
          <FileTree />
        </div>
        <div className="next-library-footer">
          <span className="next-local-dot" />
          Local library
        </div>
        <div
          {...separatorProps}
          aria-label="Resize library"
          className="next-resize-sash next-resize-left"
          data-active={resizing || undefined}
        />
      </aside>
    </AnimatedSidePanel>
  );
});
