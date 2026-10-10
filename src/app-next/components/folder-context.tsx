import { memo } from "react";
import { CaretRightIcon, FolderSimpleIcon } from "@phosphor-icons/react";

import { useImageStore } from "@/store/image-store";

export const FolderContext = memo(function FolderContext() {
  const path = useImageStore((state) => state.currentFolderPath);
  const parts = path?.split(/[/\\]/).filter(Boolean) ?? [];
  const name = parts.at(-1) ?? "Library";
  const parent = parts.at(-2);

  return (
    <div
      aria-label="Current folder"
      className="next-folder-context app-selectable-text"
      title={path ?? undefined}
    >
      <FolderSimpleIcon aria-hidden="true" size={16} />
      {parent ? <span className="next-folder-parent">{parent}</span> : null}
      {parent ? <CaretRightIcon aria-hidden="true" size={11} /> : null}
      <span className="next-folder-name">{name}</span>
    </div>
  );
});
