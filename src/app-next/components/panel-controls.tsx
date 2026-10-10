import { memo } from "react";
import {
  FilmStripIcon,
  InfoIcon,
  SidebarSimpleIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";

import { ActionButton } from "./action-button";

import { useLayoutStore } from "@/store/layout-store";

export const PanelControls = memo(function PanelControls({
  library = true,
  filmstrip = true,
}: {
  library?: boolean;
  filmstrip?: boolean;
}) {
  const libraryOpen = useLayoutStore(
    (state) => state.panels.sidebar && !state.sidePanelsHidden,
  );
  const infoOpen = useLayoutStore(
    (state) => state.panels.infoPanel && !state.sidePanelsHidden,
  );
  const editOpen = useLayoutStore(
    (state) =>
      state.panels.editPanel &&
      !state.panels.infoPanel &&
      !state.sidePanelsHidden,
  );
  const filmstripOpen = useLayoutStore((state) => state.panels.filmstrip);
  const activeLayout = useLayoutStore((state) => state.activeLayout);
  const togglePanel = useLayoutStore((state) => state.togglePanel);

  return (
    <div
      aria-label="Workspace panels"
      className="next-panel-controls"
      role="group"
    >
      {library ? (
        <ActionButton
          active={libraryOpen}
          label="Library"
          shortcut="P"
          onPress={() => togglePanel("sidebar")}
        >
          <SidebarSimpleIcon size={17} />
        </ActionButton>
      ) : null}
      {filmstrip ? (
        <ActionButton
          active={filmstripOpen}
          label="Filmstrip"
          onPress={() => togglePanel("filmstrip")}
        >
          <FilmStripIcon size={17} />
        </ActionButton>
      ) : null}
      {activeLayout === "detail" ? (
        <ActionButton
          active={editOpen}
          label="Adjustments"
          shortcut="E"
          onPress={() => togglePanel("editPanel")}
        >
          <SlidersHorizontalIcon size={17} />
        </ActionButton>
      ) : null}
      {activeLayout !== "inspector" ? (
        <ActionButton
          active={infoOpen}
          label="Photo information"
          shortcut="I"
          onPress={() => togglePanel("infoPanel")}
        >
          <InfoIcon size={17} />
        </ActionButton>
      ) : null}
    </div>
  );
});
