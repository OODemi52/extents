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
      className="border border-zinc-700 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] bg-[rgba(30,30,30,0.99)] hover:bg-[rgba(50,50,50,0.99)] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]"
      closeDelay={0}
      content={tooltip}
      delay={500}
      offset={0}
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
