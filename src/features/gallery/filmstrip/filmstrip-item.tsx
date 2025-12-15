import { Card, CardBody, CardFooter } from "@heroui/card";
import { useState } from "react";

import { Thumbnail } from "../thumbnail/thumbnail";

import { RatingStars } from "@/features/metadata/rating/components/rating-stars";
import { ImageMetadata } from "@/types/image";

interface FilmstripItemProps {
  file: ImageMetadata;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

export function FilmstripItem({
  file,
  index,
  isSelected,
  onSelect,
}: FilmstripItemProps) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <Card
      disableAnimation
      disableRipple
      isPressable
      className="group relative h-full w-full bg-transparent p-0 shadow-none"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onPress={onSelect}
    >
      <CardBody className="h-full w-full p-0">
        <Thumbnail
          disableAnimation
          showSelectionRing
          index={index}
          isSelected={isSelected}
          path={file.path}
          onClick={onSelect}
        />
      </CardBody>

      <CardFooter
        className={`pointer-events-none flex justify-center px-0 py-0 transition-opacity duration-200 ease-out ${isHovering ? "opacity-100" : "opacity-0"}`}
      >
        <div className="pointer-events-auto rounded-full bg-zinc-900/70 px-1 py-0.5">
          <RatingStars
            compact
            className="mr-0 !gap-0"
            path={file.path}
            size="sm"
          />
        </div>
      </CardFooter>
    </Card>
  );
}
