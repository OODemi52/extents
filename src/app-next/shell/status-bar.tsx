import { memo } from "react";
import { FilmStripIcon } from "@phosphor-icons/react";

import { ActionButton } from "../components/action-button";
import { SelectionStatus } from "../components/selection-status";
import { CompactSortMenu } from "../components/compact-sort-menu";

import { ActivityRail } from "./activity-rail";

import { useLayoutStore } from "@/store/layout-store";

export const StatusBar = memo(function StatusBar() {
  const layout = useLayoutStore((state) => state.activeLayout);
  const filmstrip = useLayoutStore((state) => state.panels.filmstrip);
  const togglePanel = useLayoutStore((state) => state.togglePanel);

  return (
    <footer className="next-statusbar next-chrome">
      <div className="next-statusbar-workspace">
        <div className="next-statusbar-leading">
          <ActivityRail />
          <div className="next-statusbar-sort">
            <CompactSortMenu />
          </div>
        </div>
        <div className="next-statusbar-center">
          <SelectionStatus />
        </div>
        <div className="next-statusbar-trailing">
          <ActionButton
            active={filmstrip && layout === "detail"}
            disabled={layout !== "detail"}
            label="Filmstrip"
            onPress={() => togglePanel("filmstrip")}
          >
            <FilmStripIcon size={18} />
          </ActionButton>
        </div>
      </div>
    </footer>
  );
});
