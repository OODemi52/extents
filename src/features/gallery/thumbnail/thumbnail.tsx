import { Card, Skeleton } from "@heroui/react";
import { ImageBrokenIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

import { useThumbnailQuery } from "../hooks/use-thumbnails";

interface ThumbnailProps {
  path: string;
  isSelected: boolean;
  disableAnimation?: boolean;
  showSelectionRing?: boolean;
  rounded?: boolean;
}

export function Thumbnail({
  path,
  isSelected,
  disableAnimation,
  showSelectionRing = true,
  rounded = true,
}: ThumbnailProps) {
  const { thumbnail, error } = useThumbnailQuery(path);
  const [loaded, setLoaded] = useState(false);

  return (
    <Card
      className={`relative flex h-full w-full items-center justify-center !gap-0 bg-transparent !p-0 shadow-none ${
        rounded ? "rounded-sm" : "rounded-none"
      }`}
    >
      <div
        className={`flex h-full w-full items-center justify-center overflow-hidden ${
          rounded ? "rounded-sm" : "rounded-none"
        }`}
      >
        {error ? (
          <div
            aria-label="Thumbnail unavailable"
            className={`flex h-full w-full items-center justify-center text-red-300 ${
              isSelected && showSelectionRing
                ? "[outline:2px_solid_var(--focus-border,#007fd4)] [outline-offset:-2px]"
                : ""
            }`}
            role="img"
          >
            <ImageBrokenIcon aria-hidden="true" size={24} weight="duotone" />
          </div>
        ) : thumbnail ? (
          <img
            alt=""
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
            aria-hidden="true"
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
