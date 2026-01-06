import type { PressEvent } from "@react-types/shared";

import { Card } from "@heroui/card";
import { Skeleton } from "@heroui/skeleton";
import { ImageBrokenIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

import { useThumbnailQuery } from "../hooks/use-thumbnails";

interface ThumbnailProps {
  path: string;
  index: number;
  isSelected: boolean;
  onClick: (event: PressEvent) => void;
  disableAnimation?: boolean;
  showSelectionRing?: boolean;
  rounded?: boolean;
}

export function Thumbnail({
  path,
  index,
  isSelected,
  onClick,
  disableAnimation,
  showSelectionRing = true,
  rounded = true,
}: ThumbnailProps) {
  const { thumbnail, error } = useThumbnailQuery(path);
  const [loaded, setLoaded] = useState(false);

  return (
    <Card
      disableRipple
      className={`relative flex h-full w-full items-center justify-center bg-transparent shadow-none ${
        rounded ? "rounded-sm" : "rounded-none"
      }`}
      disableAnimation={disableAnimation}
      radius={rounded ? "sm" : "none"}
      onPress={onClick}
    >
      <div
        className={`flex h-full w-full items-center justify-center overflow-hidden ${
          rounded ? "rounded-sm" : "rounded-none"
        }`}
      >
        {error ? (
          <div
            className={`flex h-full w-full items-center justify-center text-red-300 ${
              isSelected && showSelectionRing
                ? "[outline:2px_solid_var(--focus-border,#007fd4)] [outline-offset:-2px]"
                : ""
            }`}
          >
            <ImageBrokenIcon size={24} weight="duotone" />
          </div>
        ) : thumbnail ? (
          <img
            alt={`Thumbnail ${index}`}
            className={`block max-h-full max-w-full object-contain transition-opacity duration-500 ${
              loaded || disableAnimation ? "opacity-100" : "opacity-50"
            } ${
              isSelected && showSelectionRing
                ? "[outline:2px_solid_var(--focus-border,#007fd4)] [outline-offset:-2px]"
                : ""
            }`}
            src={thumbnail}
            onLoad={() => setLoaded(true)}
          />
        ) : (
          <Skeleton
            className={`h-full w-full ${
              isSelected && showSelectionRing
                ? "[outline:2px_solid_var(--focus-border,#007fd4)] [outline-offset:-2px]"
                : ""
            }`}
          />
        )}
      </div>
    </Card>
  );
}
