import { Chip, Input } from "@heroui/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FunnelIcon,
} from "@phosphor-icons/react/dist/ssr";
import { ButtonGroup } from "@heroui/button";

import { ToolbarIconButton } from "./ui/buttons/toolbar-icon-button";

export function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="w-full flex items-center justify-between py-1 px-2 border-b border-b-zinc-700"
    >
      {/* Load bearing div, used as a spacer/padding */}
      <div className="w-1" />

      <div className="flex items-center space-x-2 max-w-3xl w-full">
        <ButtonGroup>
          <ToolbarIconButton
            icon={<ArrowLeftIcon size={20} />}
            isActive={false}
            tooltip="Back"
            onPress={() => console.log("back")}
          />
          <ToolbarIconButton
            icon={<ArrowRightIcon size={20} />}
            isActive={false}
            tooltip="Forward"
            onPress={() => console.log("forward")}
          />
        </ButtonGroup>

        <Input className="flex-1 px-4" placeholder="Search [insert folder]" />

        <ToolbarIconButton
          icon={<FunnelIcon size={20} weight="duotone" />}
          isActive={false}
          tooltip="Filter"
          onPress={() => console.log("filter")}
        />
      </div>

      {/* Load bearing div, used as a spacer/padding */}
      <div className="w-1" />
    </div>
  );
}
