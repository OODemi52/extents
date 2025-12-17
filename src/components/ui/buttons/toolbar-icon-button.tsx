import { Button } from "@heroui/button";
import { Tooltip } from "@heroui/tooltip";

import { cn } from "@/lib/cn";

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
  isActive = false,
  onPress,
  isDisabled,
  className,
}: ToolbarIconButtonProps) {
  return (
    <Tooltip
      className="border border-zinc-500"
      closeDelay={0}
      content={tooltip}
      delay={500}
      offset={-10}
      radius="sm"
      size="sm"
    >
      <Button
        disableRipple
        isIconOnly
        className={cn(
          "transition-colors bg-transparent",
          isActive ? "text-blue-500" : "hover:text-white",
          className,
        )}
        isDisabled={isDisabled}
        size="sm"
        onPress={onPress}
      >
        {icon}
      </Button>
    </Tooltip>
  );
}
