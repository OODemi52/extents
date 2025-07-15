import { useRef } from "react";

import { FilmstripProps } from "../types/image";

import { LazyThumbnail } from "./lazy-thumbnail";

export function Filmstrip({
  fileMetadataList,
  selectedIndex,
  onSelectImage,
}: FilmstripProps) {
  const filmstripRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={filmstripRef}
      className="h-24 overflow-x-auto overflow-y-hidden flex gap-2 p-2 pb-4"
    >
      {fileMetadataList.map((file, idx) => (
        <LazyThumbnail
          key={`${file} + ${idx}`}
          isSelected={idx === selectedIndex}
          path={file.thumbnailPath || ""}
          onClick={() => onSelectImage(idx)}
        />
      ))}
    </div>
  );
}
