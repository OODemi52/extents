import type { ReactNode } from "react";

import { Button } from "@heroui/react";

import { ControlTooltip } from "./control-tooltip";

import { cn } from "@/lib/cn";

type ActionButtonProps = {
  active?: boolean;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  shortcut?: string;
};

export function ActionButton({
  active,
  children,
  className,
  disabled,
  label,
  onPress,
  shortcut,
}: ActionButtonProps) {
  return (
    <ControlTooltip disabled={disabled} label={label} shortcut={shortcut}>
      <Button
        isIconOnly
        aria-label={label}
        aria-pressed={active}
        className={cn("next-action", className)}
        data-active={active || undefined}
        isDisabled={disabled}
        size="sm"
        variant="ghost"
        onPress={onPress}
      >
        {children}
      </Button>
    </ControlTooltip>
  );
}
