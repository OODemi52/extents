import type { ReactNode } from "react";

import { Tooltip } from "@heroui/react";

interface EditorTooltipProps {
  children: ReactNode;
  content: ReactNode;
  delay?: number;
  offset?: number;
}

export function EditorTooltip({
  children,
  content,
  delay = 650,
  offset = 6,
}: EditorTooltipProps) {
  return (
    <Tooltip closeDelay={0} delay={delay}>
      <Tooltip.Trigger className="contents">{children}</Tooltip.Trigger>
      <Tooltip.Content
        className="editor-tooltip rounded-lg px-2 py-1 text-xs text-zinc-100"
        offset={offset}
      >
        {content}
      </Tooltip.Content>
    </Tooltip>
  );
}
