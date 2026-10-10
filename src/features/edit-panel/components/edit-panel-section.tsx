import type { ReactNode } from "react";

import { Accordion } from "@heroui/react";

interface EditPanelSectionProps {
  children: ReactNode;
  icon: ReactNode;
  id: string;
  isDisabled?: boolean;
  title: string;
}

export function EditPanelSection({
  children,
  icon,
  id,
  isDisabled,
  title,
}: EditPanelSectionProps) {
  return (
    <Accordion.Item
      className="editor-surface w-full rounded-[16px]"
      id={id}
      isDisabled={isDisabled}
    >
      <Accordion.Heading>
        <Accordion.Trigger
          aria-label={title}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-zinc-200"
        >
          <span className="text-zinc-400">{icon}</span>
          <span className="min-w-0 flex-1 truncate">{title}</span>
          <Accordion.Indicator className="h-4 w-4 shrink-0 text-zinc-500" />
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel>
        <Accordion.Body className="px-3 pb-2 pt-0">{children}</Accordion.Body>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
