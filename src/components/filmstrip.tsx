// components/Filmstrip.tsx
import { useRef } from "react";

import { useImageStore } from "../store/image-store";
import { useImageLoader } from "../hooks/use-image-loader";

import { LazyThumbnail } from "./lazy-thumbnail";

export function Filmstrip() {
  const filmstripRef = useRef<HTMLDivElement>(null);
  const { fileMetadataList, selectedIndex } = useImageStore();
  const { handleSelectImage } = useImageLoader();

  return (
    <div
      ref={filmstripRef}
      className="h-24 overflow-x-auto overflow-y-hidden flex gap-2 p-2 pb-4"
    >
      {fileMetadataList.map((file, index) => (
        <LazyThumbnail
          key={`${file.path}-${index}`}
          index={index}
          isSelected={index === selectedIndex}
          path={file.thumbnailPath || ""}
          onClick={() => handleSelectImage(index)}
        />
      ))}
    </div>
  );
}
