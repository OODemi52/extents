import { Button } from "@heroui/react";

import { cn } from "@/lib/cn";
import { EditorTooltip } from "@/components/ui/editor-tooltip";

interface ToolbarIconButtonProps {
  tooltip: string;
  icon: React.ReactNode;
  isActive?: boolean;
  onPress: () => void;
  isDisabled?: boolean;
  className?: string;
}

export function ToolbarIconButton({
  tooltip,
  icon,
  isActive,
  onPress,
  isDisabled,
  className,
}: ToolbarIconButtonProps) {
  return (
    <EditorTooltip content={tooltip}>
      <Button
        isIconOnly
        aria-label={tooltip}
        aria-pressed={typeof isActive === "boolean" ? isActive : undefined}
        className={cn(
          "editor-focus-ring h-8 w-8 min-w-8 rounded-xl bg-transparent text-zinc-400 transition-colors",
          isActive
            ? "bg-blue-500/10 text-blue-400"
            : "hover:bg-white/[0.055] hover:text-zinc-100",
          className,
        )}
        isDisabled={isDisabled}
        size="sm"
        onPress={onPress}
      >
        {icon}
      </Button>
    </EditorTooltip>
  );
}
