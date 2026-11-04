import type { ReactNode } from "react";

import { Tooltip } from "@heroui/react";

export function ControlTooltip({
  children,
  disabled,
  label,
  shortcut,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  shortcut?: string;
}) {
  return (
    <Tooltip closeDelay={0} delay={500} isDisabled={disabled}>
      <Tooltip.Trigger
        className="inline-flex min-w-0"
        role="presentation"
        tabIndex={-1}
      >
        {children}
      </Tooltip.Trigger>
      <Tooltip.Content className="editor-tooltip rounded-lg px-2 py-1 text-xs text-zinc-100">
        <span className="next-tooltip-content">
          {label}
          {shortcut ? <kbd>{shortcut}</kbd> : null}
        </span>
      </Tooltip.Content>
    </Tooltip>
  );
}
