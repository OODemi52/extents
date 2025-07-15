import { useEffect, useRef } from "react";

import { useImageStore } from "../store/image-store";

import { LazyThumbnail } from "./lazy-thumbnail";

interface FilmstripProps {
  onSelectImage: (idx: number) => void;
}

export function Filmstrip({ onSelectImage }: FilmstripProps) {
  const filmstripRef = useRef<HTMLDivElement>(null);
  const { fileMetadataList, selectedIndex } = useImageStore();

  return (
    <div
      ref={filmstripRef}
      className="h-24 overflow-x-auto overflow-y-hidden flex gap-2 p-2 pb-4"
    >
      {fileMetadataList.map((file, idx) => (
        <LazyThumbnail
          key={`${file.path}-${idx}`}
          index={idx}
          isSelected={idx === selectedIndex}
          path={file.thumbnailPath || "none"}
          onClick={() => onSelectImage(idx)}
        />
      ))}
    </div>
  );
}
