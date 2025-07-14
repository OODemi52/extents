import { Card } from "@heroui/card";
import { useEffect, useRef, useState } from "react";

import { ThumbnailProps } from "../types/image";

export function LazyThumbnail({
  path,
  isSelected,
  getThumbnail,
  onClick,
}: ThumbnailProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const thumbnailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!thumbnailRef.current || thumbnail) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !thumbnail && !isLoading) {
          setIsLoading(true);
          getThumbnail(path).then((data) => {
            setThumbnail(data);
            setIsLoading(false);
          });
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(thumbnailRef.current);

    return () => observer.disconnect();
  }, [thumbnail, isLoading, getThumbnail]);

  return (
    <Card
      className={`aspect-square shrink-0 cursor-pointer ${
        isSelected ? "ring-2 ring-blue-500" : ""
      }`}
      radius="none"
      onPress={onClick}
    >
      <div ref={thumbnailRef} className="w-full h-full">
        {thumbnail ? (
          <img
            alt="Thumbnail"
            className="w-full h-full object-cover"
            src={thumbnail}
          />
        ) : (
          <div className="w-full h-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
            {isLoading ? (
              <div className="animate-pulse w-6 h-6 rounded-full bg-gray-400" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-400" />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
