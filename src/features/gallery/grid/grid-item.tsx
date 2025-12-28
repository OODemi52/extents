import type { PressEvent } from "@react-types/shared";

import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { memo, useCallback, useState } from "react";

import { Thumbnail } from "../thumbnail/thumbnail";

import { FlagControls } from "@/features/annotate/flagging/components/flag-controls";
import { RatingStars } from "@/features/annotate/rating/components/rating-stars";
import { ImageMetadata } from "@/types/image";
import { useLayoutStore } from "@/store/layout-store";
import { useFlagStore } from "@/features/annotate/flagging/store/use-flagging-store";

interface GridItemProps {
  file: ImageMetadata;
  index: number;
  isSelected: boolean;
  onSelect: (selectionMode?: "single" | "multi") => void;
}

export const GridItem = memo(function GridItem({
  file,
  index,
  isSelected,
  onSelect,
}: GridItemProps) {
  const setActiveLayout = useLayoutStore(
    (selected) => selected.setActiveLayout,
  );
  const [isHovering, setIsHovering] = useState(false);
  const flagState = useFlagStore((s) => s.flags[file.path] ?? "unflagged");
  const handlePress = useCallback(
    (event: PressEvent) => {
      const selectionMode = event.metaKey || event.ctrlKey ? "multi" : "single";

      onSelect(selectionMode);
    },
    [onSelect],
  );

  const lastDotIndex = file.fileName.lastIndexOf(".");

  const baseName =
    lastDotIndex > 0 ? file.fileName.slice(0, lastDotIndex) : file.fileName;

  const extension =
    lastDotIndex > 0 ? file.fileName.slice(lastDotIndex + 1) : "";

  return (
    <Card
      key={file.path}
      disableAnimation
      disableRipple
      isPressable
      className={`group relative m-1 h-full w-full overflow-hidden rounded-md bg-zinc-700 p-0 ${
        isSelected ? "ring-2 ring-blue-500" : ""
      }`}
      title={file.fileName}
      onDoubleClick={() => {
        onSelect("single");
        setActiveLayout("detail");
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onPress={handlePress}
    >
      <CardHeader className="z-10 flex justify-between px-2 py-1 text-[8px] font-bold">
        <div className="truncate">{baseName}</div>
        <div className="rounded-sm bg-zinc-900 px-1 uppercase">{extension}</div>
      </CardHeader>
      <div
        className={`z-20 pointer-events-none absolute inset-0 rounded-md bg-black/60 transition-opacity duration-200 ${
          flagState === "rejected" ? "opacity-60" : "opacity-0"
        }`}
      />
      <CardBody className="h-full w-full p-2">
        <Thumbnail
          disableAnimation
          index={index}
          isSelected={isSelected}
          path={file.path}
          showSelectionRing={false}
          onClick={handlePress}
        />
      </CardBody>
      <CardFooter
        className={`pointer-events-none z-10 flex justify-between px-2 py-0 transition-opacity duration-200 ease-out ${isHovering ? "opacity-100" : "opacity-0"}`}
      >
        <div className="pointer-events-auto flex items-center gap-1">
          <FlagControls path={file.path} />
        </div>
        <div className="pointer-events-auto flex items-center">
          <RatingStars path={file.path} />
        </div>
      </CardFooter>
    </Card>
  );
});
