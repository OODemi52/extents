import { memo } from "react";
import { Button } from "@heroui/react";
import { FolderOpenIcon } from "@phosphor-icons/react";

import { usePanelResize } from "../hooks/use-panel-resize";
import { usePanelWidthLimit } from "../hooks/use-panel-width-limit";

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
  const minWidth = Math.max(190, SIDEBAR_MIN_WIDTH);
  const maxWidth = usePanelWidthLimit(SIDEBAR_MAX_WIDTH, minWidth);
  const { liveWidth, resizing, separatorProps } = usePanelResize({
    width,
    min: minWidth,
    max: maxWidth,
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
        <div className="next-library-tree">
          <FileTree />
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
