import { Card } from "@heroui/card";
import { Skeleton } from "@heroui/skeleton";
import { useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

interface LazyThumbnailProps {
  path: string;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

export function LazyThumbnail({
  path,
  index,
  isSelected,
  onClick,
}: LazyThumbnailProps) {
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const imgSrc = path ? convertFileSrc(path) : null;

  useEffect(() => {
    console.log(path);
  }, []);

  return (
    <Card
      className={`aspect-square shrink-0 cursor-pointer ${
        isSelected ? "ring-2 ring-blue-500" : ""
      }`}
      radius="none"
      onPress={onClick}
    >
      <div ref={thumbnailRef} className="w-full h-full">
        {imgSrc ? (
          <img
            alt="Thumbnail"
            className="w-full h-full object-cover"
            src={imgSrc}
          />
        ) : (
          <Skeleton className="w-full h-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
            <div className="animate-pulse w-6 h-6 rounded-full bg-gray-400">
              ⛓️‍💥
            </div>
          </Skeleton>
        )}
      </div>
    </Card>
  );
}
