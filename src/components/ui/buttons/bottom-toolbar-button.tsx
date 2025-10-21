import { Button } from "@heroui/button";
import { LayoutIcon, ColumnsIcon, InfoIcon } from "@phosphor-icons/react";

export function BottomToolbarButton() {
  return (
    <Button
      isIconOnly
      className="hover:text-white bg-transparent border transition-colors"
    >
      <InfoIcon size={16} />
    </Button>
  );
}
