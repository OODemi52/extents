import type { PressEvent } from "@react-types/shared";

import { Card, CardBody, CardFooter } from "@heroui/card";
import { useState } from "react";

import { Thumbnail } from "../thumbnail/thumbnail";

import { FlagControls } from "@/features/annotate/flagging/components/flag-controls";
import { RatingStars } from "@/features/annotate/rating/components/rating-stars";
import { ImageMetadata } from "@/types/image";

interface FilmstripItemProps {
  file: ImageMetadata;
  index: number;
  isSelected: boolean;
  size: number;
  density: "thumb" | "meta" | "rating" | "full";
  onSelect: (selectionMode?: "single" | "multi") => void;
}

export function FilmstripItem({
  file,
  index,
  isSelected,
  size,
  density,
  onSelect,
}: FilmstripItemProps) {
  const [isHovering, setIsHovering] = useState(false);
  const showMeta = density !== "thumb";
  const showRating = density === "rating" || density === "full";
  const showFlags = density === "full";
  const handlePress = (event: PressEvent) => {
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
      disableAnimation
      disableRipple
      isPressable
      className="group relative h-full w-full bg-transparent p-0 shadow-none"
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onPress={handlePress}
    >
      <CardBody className="h-full w-full p-0">
        <Thumbnail
          disableAnimation
          showSelectionRing
          index={index}
          isSelected={isSelected}
          path={file.path}
          rounded={false}
          onClick={handlePress}
        />
      </CardBody>

      {showMeta && (
        <div className="pointer-events-none absolute left-1 right-1 top-1 rounded-sm bg-black/40 px-1 py-0.5 text-[9px] font-medium text-white/90 backdrop-blur-sm">
          <div className="flex items-center gap-1">
            <span className="truncate">{baseName}</span>
            {extension ? (
              <span className="rounded-sm bg-black/60 px-1 uppercase text-[8px]">
                {extension}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {(showRating || showFlags) && (
        <CardFooter
          className={`pointer-events-none absolute inset-x-0 bottom-1 flex items-center justify-center gap-1 px-0 py-0 transition-opacity duration-150 ${isHovering ? "opacity-100" : "opacity-0"}`}
        >
          {showRating && (
            <div className="pointer-events-auto rounded-full bg-zinc-900/70 px-1 py-0.5">
              <RatingStars
                compact
                className="mr-0 !gap-0"
                path={file.path}
                size="sm"
              />
            </div>
          )}
          {showFlags && (
            <div className="pointer-events-auto rounded-full bg-zinc-900/70 px-0.5 py-0.5">
              <FlagControls className="gap-0" path={file.path} size="sm" />
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
