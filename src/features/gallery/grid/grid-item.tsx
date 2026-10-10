import { Card, CardHeader, CardContent, CardFooter } from "@heroui/react";
import { memo, useCallback, useState, forwardRef } from "react";

import { Thumbnail } from "../thumbnail/thumbnail";

import { FlagControls } from "@/features/annotate/flagging/components/flag-controls";
import { RatingStars } from "@/features/annotate/rating/components/rating-stars";
import { FileMetadata } from "@/types/image";
import { useLayoutStore } from "@/store/layout-store";
import { useFlagStore } from "@/features/annotate/flagging/store/use-flagging-store";

interface GridItemProps {
  file: FileMetadata;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  showFileNameInGrid: boolean;
  showFileExtensionInGrid: boolean;
  onSelect: (path: string, selectionMode?: "single" | "multi") => void;
}

type GalleryClickEvent = {
  ctrlKey: boolean;
  metaKey: boolean;
};

export const GridItem = memo(
  forwardRef<HTMLDivElement, GridItemProps>(function GridItem(
    {
      file,
      index,
      isActive,
      isSelected,
      showFileNameInGrid,
      showFileExtensionInGrid,
      onSelect,
    },
    ref,
  ) {
    const setActiveLayout = useLayoutStore(
      (selected) => selected.setActiveLayout,
    );
    const [isHovering, setIsHovering] = useState(false);
    const flagState = useFlagStore(
      (state) => state.flags[file.path] ?? "unflagged",
    );
    const handleClick = useCallback(
      (event: GalleryClickEvent) => {
        const selectionMode =
          event.metaKey || event.ctrlKey ? "multi" : "single";

        onSelect(file.path, selectionMode);
      },
      [file.path, onSelect],
    );
    const handleDoubleClick = useCallback(() => {
      onSelect(file.path, "single");
      setActiveLayout("detail");
    }, [file.path, onSelect, setActiveLayout]);

    const lastDotIndex = file.fileName.lastIndexOf(".");

    const baseName =
      lastDotIndex > 0 ? file.fileName.slice(0, lastDotIndex) : file.fileName;

    const extension =
      lastDotIndex > 0 ? file.fileName.slice(lastDotIndex + 1) : "";
    const showHeader = showFileNameInGrid || showFileExtensionInGrid;

    return (
      <Card
        key={file.path}
        ref={ref}
        aria-label={file.fileName}
        aria-selected={isSelected}
        className={`group relative m-1 h-full w-full !gap-0 overflow-hidden rounded-[16px] border border-zinc-700/50 bg-[rgba(30,30,30,0.99)] !p-0 shadow-[inset_2px_4px_16px_rgba(248,248,248,0.045)] outline-none hover:bg-[rgba(45,45,47,0.99)] ${
          isSelected ? "ring-2 ring-blue-500" : ""
        }`}
        id={`photo-grid-option-${index}`}
        role="option"
        tabIndex={-1}
        title={file.fileName}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <button
          aria-label={`Select ${file.fileName}`}
          className="absolute inset-0 z-0 h-full w-full cursor-default bg-transparent p-0 outline-none"
          tabIndex={-1}
          type="button"
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        />

        {showHeader ? (
          <CardHeader className="pointer-events-none z-10 flex justify-between gap-2 px-2 py-1 text-[11px] font-medium text-zinc-300">
            {showFileNameInGrid ? (
              <div className="truncate">{baseName}</div>
            ) : (
              <div />
            )}
            {showFileExtensionInGrid ? (
              <div className="rounded-lg bg-zinc-900/90 px-1.5 text-[10px] uppercase text-zinc-400">
                {extension}
              </div>
            ) : null}
          </CardHeader>
        ) : null}
        <div
          className={`z-20 pointer-events-none absolute inset-0 rounded-[16px] bg-black/60 transition-opacity duration-200 ${
            flagState === "rejected" ? "opacity-60" : "opacity-0"
          }`}
        />
        <CardContent className="pointer-events-none relative z-[1] h-full w-full p-2">
          <Thumbnail
            disableAnimation
            isSelected={isSelected}
            path={file.path}
            showSelectionRing={false}
          />
        </CardContent>
        <CardFooter
          className={`pointer-events-none z-10 flex justify-between px-2 py-0 transition-opacity duration-200 ease-out ${
            isHovering || isSelected
              ? "opacity-100"
              : "opacity-0 group-focus-within:opacity-100"
          }`}
        >
          <div className="pointer-events-auto flex items-center gap-1">
            <FlagControls isKeyboardAccessible={isActive} path={file.path} />
          </div>
          <div className="pointer-events-auto flex items-center">
            <RatingStars isKeyboardAccessible={isActive} path={file.path} />
          </div>
        </CardFooter>
      </Card>
    );
  }),
);

GridItem.displayName = "GridItem";
