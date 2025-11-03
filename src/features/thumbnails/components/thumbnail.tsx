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
}

export function Thumbnail({
  path,
  index,
  isSelected,
  onClick,
}: ThumbnailProps) {
  const { thumbnail, isLoading, error } = useThumbnailQuery(path);
  const [loaded, setLoaded] = useState(false);

  return (
    <Card
      disableRipple
      isPressable
      // Gonna go woth a square aspect for now until I decide tp come back and nit pick
      // Keep in mind the gutter for the scroll bar
      className={`aspect-square shrink-0 cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-blue-500 scale-105" : ""
      }`}
      radius="sm"
      onPress={onClick}
    >
      {error ? (
        <div className="h-[60px] aspect-square bg-danger-100 text-red-300 flex items-center justify-center">
          <ImageBrokenIcon className="" size={24} weight="duotone" />
        </div>
      ) : thumbnail ? (
        <img
          alt={`Thumbnail ${index}`}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            loaded ? "opacity-100" : "opacity-50"
          }`}
          src={thumbnail}
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <Skeleton className="h-[60px] aspect-square" isLoaded={isLoading} />
      )}
    </Card>
  );
}
