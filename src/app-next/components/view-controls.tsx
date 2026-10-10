import { memo } from "react";
import { Button, ButtonGroup } from "@heroui/react";
import {
  ImageSquareIcon,
  MagnifyingGlassIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";

import { ControlTooltip } from "./control-tooltip";

import { useLayoutStore } from "@/store/layout-store";

export const ViewControls = memo(function ViewControls({
  compact = false,
}: {
  compact?: boolean;
}) {
  const activeLayout = useLayoutStore((state) => state.activeLayout);
  const inspectorEnabled = useLayoutStore((state) => state.inspectorEnabled);
  const setActiveLayout = useLayoutStore((state) => state.setActiveLayout);
  const views = [
    { id: "grid" as const, label: "Grid", icon: SquaresFourIcon },
    { id: "detail" as const, label: "Detail", icon: ImageSquareIcon },
    ...(inspectorEnabled
      ? [
          {
            id: "inspector" as const,
            label: "Inspector",
            icon: MagnifyingGlassIcon,
          },
        ]
      : []),
  ];

  return (
    <ButtonGroup
      aria-label="Workspace views"
      className="next-view-controls"
      data-compact={compact || undefined}
    >
      {views.map(({ id, label, icon: Icon }) => (
        <ControlTooltip
          key={id}
          label={label}
          shortcut={id === "grid" ? "G" : id === "detail" ? "D" : undefined}
        >
          <Button
            aria-label={`${label} view`}
            aria-pressed={activeLayout === id}
            className="next-view-button"
            data-active={activeLayout === id || undefined}
            isIconOnly={compact}
            size="sm"
            variant="ghost"
            onPress={() => setActiveLayout(id)}
          >
            <Icon size={16} />
            {!compact ? <span>{label}</span> : null}
          </Button>
        </ControlTooltip>
      ))}
    </ButtonGroup>
  );
});
