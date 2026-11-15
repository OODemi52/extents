import { memo } from "react";
import {
  ImageSquareIcon,
  MagnifyingGlassIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";

import { ActionButton } from "../components/action-button";

import { useLayoutStore } from "@/store/layout-store";

export const ActivityRail = memo(function ActivityRail() {
  const layout = useLayoutStore((state) => state.activeLayout);
  const inspectorEnabled = useLayoutStore((state) => state.inspectorEnabled);
  const setLayout = useLayoutStore((state) => state.setActiveLayout);

  return (
    <nav aria-label="Workspace navigation" className="next-activity-rail">
      <ActionButton
        active={layout === "grid"}
        label="Grid view"
        shortcut="G"
        onPress={() => setLayout("grid")}
      >
        <SquaresFourIcon size={18} />
      </ActionButton>
      {inspectorEnabled ? (
        <ActionButton
          active={layout === "inspector"}
          label="Inspector view"
          onPress={() => setLayout("inspector")}
        >
          <MagnifyingGlassIcon size={18} />
        </ActionButton>
      ) : null}
      <ActionButton
        active={layout === "detail"}
        label="Detail view"
        shortcut="D"
        onPress={() => setLayout("detail")}
      >
        <ImageSquareIcon size={18} />
      </ActionButton>
    </nav>
  );
});
