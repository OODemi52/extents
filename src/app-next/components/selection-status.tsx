import { memo } from "react";
import { XIcon } from "@phosphor-icons/react";

import { ActionButton } from "./action-button";

import { useFilteredImages } from "@/features/filter/hooks/use-filtered-files";
import { useImageStore } from "@/store/image-store";

export const SelectionStatus = memo(function SelectionStatus() {
  const total = useImageStore((state) => state.files.length);
  const selectedCount = useImageStore((state) => state.selectedPaths.size);
  const selectedName = useImageStore((state) =>
    state.selectedIndex === null
      ? null
      : state.files[state.selectedIndex]?.fileName,
  );
  const deselectAll = useImageStore((state) => state.deselectAll);
  const visibleCount = useFilteredImages().length;
  const countLabel =
    visibleCount === total
      ? `${total} photos`
      : `${visibleCount} of ${total} photos`;
  const isMac = /Mac/i.test(navigator.userAgent);

  return (
    <div
      className="next-selection-status"
      data-has-selection={selectedCount > 0 || undefined}
    >
      <span className="next-photo-count" title={countLabel}>
        {countLabel}
      </span>
      {selectedCount ? <span className="next-status-divider" /> : null}
      {selectedCount ? (
        <span className="next-selected-name" title={selectedName ?? undefined}>
          {selectedCount > 1 ? `${selectedCount} selected` : selectedName}
        </span>
      ) : null}
      {selectedCount ? (
        <ActionButton
          className="next-clear-selection"
          label="Deselect all"
          shortcut={isMac ? "Cmd D" : "Ctrl D"}
          onPress={deselectAll}
        >
          <XIcon size={12} />
        </ActionButton>
      ) : null}
    </div>
  );
});
