import { ThumbnailGrid } from "@/features/gallery/grid/grid";

export function ThumbnailGridLayout() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <ThumbnailGrid />
      </div>
    </div>
  );
}
