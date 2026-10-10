import type { ShellVariant } from "../experiment";

import { memo } from "react";
import { FunnelIcon } from "@phosphor-icons/react";

import { ActionButton } from "../components/action-button";
import { FolderContext } from "../components/folder-context";
import { ViewControls } from "../components/view-controls";

import { SortSelect } from "@/features/filter/components/title-bar/sort-select";
import { useFilterStore } from "@/features/filter/stores/filter-store";

export const WorkspaceHeader = memo(function WorkspaceHeader({
  variant,
}: {
  variant: ShellVariant;
}) {
  const filtersOpen = useFilterStore((state) => state.isOpen);
  const toggleFilters = useFilterStore((state) => state.toggleOpen);

  return (
    <div className="next-workspace-header">
      <div className="next-workspace-header-leading">
        {variant === "editor" ? <ViewControls /> : <FolderContext />}
      </div>
      <div className="next-workspace-header-trailing">
        {variant === "editor" ? <FolderContext /> : null}
        <ActionButton
          active={filtersOpen}
          label={filtersOpen ? "Hide filters" : "Show filters"}
          onPress={toggleFilters}
        >
          <FunnelIcon size={16} />
        </ActionButton>
        <SortSelect />
      </div>
    </div>
  );
});
