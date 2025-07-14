import { useRef } from "react";

import { FilmstripProps } from "../types/image";

import { LazyThumbnail } from "./lazy-thumbnail";

export function Filmstrip({
  imagePaths,
  selectedIndex,
  onSelectImage,
  getThumbnailForImage,
}: FilmstripProps) {
  const filmstripRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={filmstripRef}
      className="h-16 overflow-x-auto flex gap-2 p-2 bg-gray-200 dark:bg-gray-800"
    >
      {imagePaths.map((path, idx) => (
        <LazyThumbnail
          key={path}
          getThumbnail={getThumbnailForImage}
          isSelected={idx === selectedIndex}
          path={path}
          onClick={() => onSelectImage(idx)}
        />
      ))}
    </div>
  );
}
