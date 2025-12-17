import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FunnelIcon,
} from "@phosphor-icons/react/dist/ssr";
import { ButtonGroup } from "@heroui/button";

import { ToolbarIconButton } from "./ui/buttons/toolbar-icon-button";

import { FilterSearchInput } from "@/features/filter/components/title-bar/search-input";
import { useFilterStore } from "@/features/filter/stores/filter-store";

export function TitleBar() {
  const isFilterOpen = useFilterStore((state) => state.isOpen);
  const toggleFilter = useFilterStore((state) => state.toggleOpen);

  return (
    <div
      data-tauri-drag-region
      className="w-full flex items-center justify-between py-1 px-2"
    >
      {/* Load bearing div, used as a spacer/padding */}
      <div className="w-1" />

      <div className="flex items-center space-x-2 max-w-3xl w-full">
        <ButtonGroup>
          <ToolbarIconButton
            isDisabled
            icon={<ArrowLeftIcon size={20} />}
            isActive={false}
            tooltip="Back"
            onPress={() => console.log("back")}
          />
          <ToolbarIconButton
            isDisabled
            icon={<ArrowRightIcon size={20} />}
            isActive={false}
            tooltip="Forward"
            onPress={() => console.log("forward")}
          />
        </ButtonGroup>

        <FilterSearchInput />

        <ToolbarIconButton
          icon={<FunnelIcon size={20} weight="duotone" />}
          isActive={isFilterOpen}
          tooltip={isFilterOpen ? "Hide filters" : "Show filters"}
          onPress={toggleFilter}
        />
      </div>

      {/* Load bearing div, used as a spacer/padding */}
      <div className="w-1" />
    </div>
  );
}
