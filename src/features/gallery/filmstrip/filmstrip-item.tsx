import { forwardRef } from "react";
import { Card, CardContent, CardFooter } from "@heroui/react";
import { useState } from "react";

import { Thumbnail } from "../thumbnail/thumbnail";

import { FlagControls } from "@/features/annotate/flagging/components/flag-controls";
import { RatingStars } from "@/features/annotate/rating/components/rating-stars";
import { FileMetadata } from "@/types/image";

interface FilmstripItemProps {
  file: FileMetadata;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  size: number;
  density: "thumb" | "meta" | "rating" | "full";
  onSelect: (selectionMode?: "single" | "multi") => void;
}

export const FilmstripItem = forwardRef<HTMLDivElement, FilmstripItemProps>(
  ({ file, index, isActive, isSelected, size, density, onSelect }, ref) => {
    const [isHovering, setIsHovering] = useState(false);
    const showMeta = density !== "thumb";
    const showRating = density === "rating" || density === "full";
    const showFlags = density === "full";
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      const selectionMode = event.metaKey || event.ctrlKey ? "multi" : "single";

      onSelect(selectionMode);
    };

    const lastDotIndex = file.fileName.lastIndexOf(".");
    const baseName =
      lastDotIndex > 0 ? file.fileName.slice(0, lastDotIndex) : file.fileName;
    const extension =
      lastDotIndex > 0 ? file.fileName.slice(lastDotIndex + 1) : "";

    return (
      <Card
        ref={ref}
        aria-label={file.fileName}
        aria-selected={isSelected}
        className="group relative h-full w-full !gap-0 rounded-none bg-transparent !p-0 shadow-none outline-none"
        id={`filmstrip-option-${index}`}
        role="option"
        style={{ width: size, height: size }}
        tabIndex={-1}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <button
          aria-label={`Select ${file.fileName}`}
          className="absolute inset-0 z-0 h-full w-full cursor-default bg-transparent p-0 outline-none"
          tabIndex={-1}
          type="button"
          onClick={handleClick}
        />

        <CardContent className="pointer-events-none relative z-[1] h-full w-full p-0">
          <Thumbnail
            disableAnimation
            showSelectionRing
            isSelected={isSelected}
            path={file.path}
            rounded={false}
          />
        </CardContent>

        {showMeta && (
          <div
            className="pointer-events-none absolute left-1 right-1 top-1 z-10 rounded-lg bg-black/40 px-1.5 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm"
            data-filmstrip-caption="true"
          >
            <div className="flex items-center gap-1">
              <span className="truncate">{baseName}</span>
              {extension ? (
                <span className="rounded-md bg-black/60 px-1 uppercase text-[10px] text-zinc-300">
                  {extension}
                </span>
              ) : null}
            </div>
          </div>
        )}

        {(showRating || showFlags) && (
          <CardFooter
            className={`pointer-events-none absolute inset-x-0 bottom-1 z-20 flex items-center justify-center gap-1 px-0 py-0 transition-opacity duration-150 ${
              isHovering || isSelected
                ? "opacity-100"
                : "opacity-0 group-focus-within:opacity-100"
            }`}
          >
            {showRating && (
              <div className="pointer-events-auto rounded-full bg-zinc-900/70 px-1 py-0.5">
                <RatingStars
                  compact
                  className="mr-0 !gap-0"
                  isKeyboardAccessible={isActive}
                  path={file.path}
                  size="sm"
                />
              </div>
            )}
            {showFlags && (
              <div className="pointer-events-auto rounded-full bg-zinc-900/70 px-0.5 py-0.5">
                <FlagControls
                  className="gap-0"
                  isKeyboardAccessible={isActive}
                  path={file.path}
                  size="sm"
                />
              </div>
            )}
          </CardFooter>
        )}
      </Card>
    );
  },
);

FilmstripItem.displayName = "FilmstripItem";
