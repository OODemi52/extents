import { Card } from "@heroui/card";
import { Skeleton } from "@heroui/skeleton";
import { useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

import { ThumbnailProps } from "../types/image";

export function LazyThumbnail({ path, isSelected, onClick }: ThumbnailProps) {
  const thumbnailRef = useRef<HTMLDivElement>(null);

  return (
    <Card
      className={`aspect-square shrink-0 cursor-pointer ${
        isSelected ? "ring-2 ring-blue-500" : ""
      }`}
      radius="none"
      onPress={onClick}
    >
      <div ref={thumbnailRef} className="w-full h-full">
        {path ? (
          <img
            alt="Thumbnail"
            className="w-full h-full object-cover"
            src={convertFileSrc(path)}
          />
        ) : (
          <Skeleton className="w-full h-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
            {path ? (
              <div className="animate-pulse w-6 h-6 rounded-full bg-gray-400" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray⛓️‍💥-400">⛓️‍💥</div>
            )}
          </Skeleton>
        )}
      </div>
    </Card>
  );
}
