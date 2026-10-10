import { memo } from "react";
import {
  FilmStripIcon,
  FolderSimpleIcon,
  GearSixIcon,
  ImageSquareIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  SlidersHorizontalIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";

import { ActionButton } from "../components/action-button";

import { useLayoutStore } from "@/store/layout-store";
import { useSettingsStore } from "@/features/settings/stores/settings-store";

export const ActivityRail = memo(function ActivityRail() {
  const layout = useLayoutStore((state) => state.activeLayout);
  const inspectorEnabled = useLayoutStore((state) => state.inspectorEnabled);
  const library = useLayoutStore(
    (state) => state.panels.sidebar && !state.sidePanelsHidden,
  );
  const edit = useLayoutStore(
    (state) =>
      state.panels.editPanel &&
      !state.panels.infoPanel &&
      !state.sidePanelsHidden,
  );
  const info = useLayoutStore(
    (state) => state.panels.infoPanel && !state.sidePanelsHidden,
  );
  const filmstrip = useLayoutStore((state) => state.panels.filmstrip);
  const setLayout = useLayoutStore((state) => state.setActiveLayout);
  const togglePanel = useLayoutStore((state) => state.togglePanel);
  const openSettings = useSettingsStore((state) => state.openSettingsModal);

  return (
    <nav
      aria-label="Workspace navigation"
      className="next-activity-rail next-chrome"
    >
      <ActionButton
        active={layout === "grid"}
        label="Grid view"
        shortcut="G"
        onPress={() => setLayout("grid")}
      >
        <SquaresFourIcon size={20} />
      </ActionButton>
      {inspectorEnabled ? (
        <ActionButton
          active={layout === "inspector"}
          label="Inspector view"
          onPress={() => setLayout("inspector")}
        >
          <MagnifyingGlassIcon size={20} />
        </ActionButton>
      ) : null}
      <ActionButton
        active={layout === "detail"}
        label="Detail view"
        shortcut="D"
        onPress={() => setLayout("detail")}
      >
        <ImageSquareIcon size={20} />
      </ActionButton>
      <span className="next-rail-divider" />
      <ActionButton
        active={library}
        label="Library"
        shortcut="P"
        onPress={() => togglePanel("sidebar")}
      >
        <FolderSimpleIcon size={20} />
      </ActionButton>
      <ActionButton
        active={filmstrip}
        label="Filmstrip"
        onPress={() => togglePanel("filmstrip")}
      >
        <FilmStripIcon size={20} />
      </ActionButton>
      <ActionButton
        active={edit && layout === "detail"}
        disabled={layout !== "detail"}
        label="Adjustments"
        shortcut="E"
        onPress={() => togglePanel("editPanel")}
      >
        <SlidersHorizontalIcon size={20} />
      </ActionButton>
      <ActionButton
        active={info}
        disabled={layout === "inspector"}
        label="Information"
        shortcut="I"
        onPress={() => togglePanel("infoPanel")}
      >
        <InfoIcon size={20} />
      </ActionButton>
      <span className="next-rail-spacer" />
      <ActionButton label="Settings" onPress={openSettings}>
        <GearSixIcon size={20} />
      </ActionButton>
    </nav>
  );
});
