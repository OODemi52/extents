import type { ShellVariant } from "../experiment";

import { memo } from "react";
import { FilmStripIcon, SidebarSimpleIcon } from "@phosphor-icons/react";

import { ActionButton } from "../components/action-button";
import { PanelControls } from "../components/panel-controls";
import { SelectionStatus } from "../components/selection-status";
import { ViewControls } from "../components/view-controls";

import { useLayoutStore } from "@/store/layout-store";

export const StatusBar = memo(function StatusBar({
  variant,
}: {
  variant: ShellVariant;
}) {
  const filmstrip = useLayoutStore((state) => state.panels.filmstrip);
  const togglePanel = useLayoutStore((state) => state.togglePanel);
  const toggleSidePanels = useLayoutStore((state) => state.toggleSidePanels);

  return (
    <footer className="next-statusbar next-chrome">
      <div className="next-statusbar-leading">
        {variant === "unified" ? <ViewControls compact /> : null}
        {variant === "unified" ? (
          <ActionButton
            active={filmstrip}
            label="Filmstrip"
            onPress={() => togglePanel("filmstrip")}
          >
            <FilmStripIcon size={16} />
          </ActionButton>
        ) : null}
        <SelectionStatus />
      </div>
      <div className="next-statusbar-trailing">
        {variant === "editor" ? <PanelControls /> : null}
        <ActionButton
          label="Toggle side panels"
          shortcut="Tab"
          onPress={toggleSidePanels}
        >
          <SidebarSimpleIcon size={16} />
        </ActionButton>
      </div>
    </footer>
  );
});
