import { useMemo } from "react";
import { Card } from "@heroui/card";

import { useExifStore } from "@/store/exif-store";
import { useImageStore } from "@/store/image-store";
import {
  formatAperture,
  formatBytes,
  formatDateTaken,
  formatDimensions,
  formatExposureBias,
  formatFocalLength,
  formatGPS,
  formatShutterSpeed,
} from "@/features/info-panel/utils/formatters";

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
    <span className="shrink-0">{label}</span>
    <span className="text-zinc-200 truncate">{value}</span>
  </div>
);

export function InfoPanel() {
  const { fileMetadataList, selectedIndex, selectedPaths } = useImageStore();
  const entriesByPath = useExifStore((state) => state.entriesByPath);
  const selectionCount = selectedPaths.size;

  const selectedFile = useMemo(() => {
    if (selectedIndex === null) {
      return null;
    }

    return fileMetadataList[selectedIndex] ?? null;
  }, [fileMetadataList, selectedIndex]);

  const exifEntry = selectedFile ? entriesByPath[selectedFile.path] : undefined;

  const metadata = exifEntry?.metadata;

  if (!selectedFile) {
    return (
      <aside className="h-full bg-zinc-900/99 border border-white/15 rounded-xl flex flex-col p-4">
        <div className="text-sm text-zinc-300 mb-2">Info</div>
        <div className="text-sm text-zinc-500">
          Select an image to see its metadata.
        </div>
      </aside>
    );
  }

  const cameraLabel = [metadata?.make, metadata?.model]
    .filter(Boolean)
    .join(" ");
  const lensLabel = [metadata?.lensMake, metadata?.lensModel]
    .filter(Boolean)
    .join(" ");

  return (
    <Card className="h-full bg-zinc-900/99 border border-white/15 rounded-xl flex flex-col p-4 gap-4 overflow-y-auto">
      <div className="text-sm text-zinc-300">Info</div>
      <div>
        <div className="text-sm text-zinc-300 mb-2">File</div>
        <div className="space-y-2">
          <InfoRow label="Name" value={selectedFile.fileName || "-"} />
          <InfoRow label="Size" value={formatBytes(selectedFile.fileSize)} />
          <InfoRow
            label="Dimensions"
            value={formatDimensions(
              metadata?.width ?? null,
              metadata?.height ?? null,
            )}
          />
          <InfoRow
            label="Date Taken"
            value={formatDateTaken(metadata?.dateTaken ?? null)}
          />
        </div>
      </div>

      <div>
        <div className="text-sm text-zinc-300 mb-2">Camera</div>
        <div className="space-y-2">
          <InfoRow label="Body" value={cameraLabel || "-"} />
          <InfoRow label="Lens" value={lensLabel || "-"} />
        </div>
      </div>

      <div>
        <div className="text-sm text-zinc-300 mb-2">Exposure</div>
        <div className="space-y-2">
          <InfoRow
            label="ISO"
            value={metadata?.iso ? `ISO ${metadata.iso}` : "-"}
          />
          <InfoRow
            label="Shutter"
            value={formatShutterSpeed(metadata?.shutterSpeed ?? null)}
          />
          <InfoRow
            label="Aperture"
            value={formatAperture(metadata?.aperture ?? null)}
          />
          <InfoRow
            label="Focal Length"
            value={formatFocalLength(metadata?.focalLength ?? null)}
          />
          <InfoRow
            label="Exposure Bias"
            value={formatExposureBias(metadata?.exposureBias ?? null)}
          />
        </div>
      </div>

      <div>
        <div className="text-sm text-zinc-300 mb-2">Location</div>
        <div className="space-y-2">
          <InfoRow
            label="GPS"
            value={formatGPS(
              metadata?.gpsLatitude ?? null,
              metadata?.gpsLongitude ?? null,
            )}
          />
        </div>
      </div>

      {selectionCount > 1 ? (
        <div className="text-xs text-zinc-500">
          {selectionCount} images selected
        </div>
      ) : null}
    </Card>
  );
}
