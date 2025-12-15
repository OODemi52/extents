import { Card } from "@heroui/card";
import { Skeleton } from "@heroui/skeleton";
import { ImageBrokenIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

import { useThumbnailQuery } from "../hooks/use-thumbnails";

interface ThumbnailProps {
  path: string;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  disableAnimation?: boolean;
  showSelectionRing?: boolean;
}

export function Thumbnail({
  path,
  index,
  isSelected,
  onClick,
  disableAnimation,
  showSelectionRing = true,
}: ThumbnailProps) {
  const { thumbnail, isLoading, error } = useThumbnailQuery(path);
  const [loaded, setLoaded] = useState(false);

  return (
    <Card
      disableRipple
      className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-sm bg-transparent shadow-none ${
        isSelected && showSelectionRing ? "ring-2 ring-blue-500" : ""
      }`}
      // Gonna go woth a square aspect for now until I decide tp come back and nit pick
      // Keep in mind the gutter for the scroll bar
      disableAnimation={disableAnimation}
      radius="sm"
      onPress={onClick}
    >
      {error ? (
        <div className="flex h-full w-full items-center justify-center text-red-300">
          <ImageBrokenIcon size={24} weight="duotone" />
        </div>
      ) : thumbnail ? (
        <img
          alt={`Thumbnail ${index}`}
          className={`max-h-full max-w-full object-contain transition-opacity duration-500 ${
            loaded || disableAnimation ? "opacity-100" : "opacity-50"
          }`}
          src={thumbnail}
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <Skeleton className="h-full w-full" isLoaded={isLoading} />
      )}
    </Card>
  );
}
