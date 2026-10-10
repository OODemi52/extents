import type { ReactNode } from "react";

import { memo, useId, useRef } from "react";
import { InfoIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/ui/empty-state";
import { useExifStore } from "@/store/exif-store";
import { useImageStore } from "@/store/image-store";
import {
  formatAperture,
  formatDateTaken,
  formatExposureBias,
  formatFocalLength,
  formatGPS,
  formatShutterSpeed,
} from "@/features/info-panel/utils/formatters";
import { formatBytes, formatDimensions } from "@/lib/formatters";

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-3 text-xs">
    <dt className="shrink-0 text-zinc-400">{label}</dt>
    <dd
      className="app-selectable-text min-w-0 truncate text-right tabular-nums text-zinc-200"
      title={value}
    >
      {value}
    </dd>
  </div>
);

const panelClassName =
  "editor-panel relative flex h-full flex-col overflow-y-auto p-4";

const InfoSection = ({
  children,
  id,
  title,
}: {
  children: ReactNode;
  id: string;
  title: string;
}) => (
  <section aria-labelledby={id}>
    <h3 className="mb-2 text-xs font-semibold text-zinc-300" id={id}>
      {title}
    </h3>
    <dl className="space-y-2">{children}</dl>
  </section>
);

type InfoPanelProps = {
  active?: boolean;
};

const getSelectedFile = (state: ReturnType<typeof useImageStore.getState>) =>
  state.selectedIndex !== null
    ? (state.files[state.selectedIndex] ?? null)
    : null;

export const InfoPanel = memo(function InfoPanel({
  active = true,
}: InfoPanelProps) {
  const retainedSelectedFileRef = useRef(
    getSelectedFile(useImageStore.getState()),
  );
  const selectedFile = useImageStore((state) =>
    active ? getSelectedFile(state) : retainedSelectedFileRef.current,
  );
  const retainedExifEntryRef = useRef(
    selectedFile
      ? useExifStore.getState().entriesByPath[selectedFile.path]
      : undefined,
  );
  const exifEntry = useExifStore((state) =>
    active && selectedFile
      ? state.entriesByPath[selectedFile.path]
      : retainedExifEntryRef.current,
  );
  const panelTitleId = useId();

  if (active) {
    retainedSelectedFileRef.current = selectedFile;
    retainedExifEntryRef.current = exifEntry;
  }

  const metadata = exifEntry?.metadata;

  if (!selectedFile) {
    return (
      <aside aria-labelledby={panelTitleId} className={panelClassName}>
        <h2 className="text-xs font-semibold text-zinc-200" id={panelTitleId}>
          Info
        </h2>
        <EmptyState
          compact
          className="flex-1"
          graphic={
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-zinc-500">
              <InfoIcon size={20} weight="duotone" />
            </span>
          }
          title="No photo selected"
        />
      </aside>
    );
  }

  const cameraLabel = [metadata?.make, metadata?.model]
    .filter(Boolean)
    .join(" ");
  const lensLabel = [metadata?.lensMake, metadata?.lensModel]
    .filter(Boolean)
    .join(" ");
  const hasCameraMetadata = Boolean(cameraLabel || lensLabel);
  const hasExposureMetadata = Boolean(
    metadata?.iso != null ||
      metadata?.shutterSpeed != null ||
      metadata?.aperture != null ||
      metadata?.focalLength != null ||
      metadata?.exposureBias != null,
  );
  const hasLocationMetadata =
    metadata?.gpsLatitude != null && metadata?.gpsLongitude != null;

  return (
    <aside aria-labelledby={panelTitleId} className={`${panelClassName} gap-4`}>
      <h2 className="text-xs font-semibold text-zinc-200" id={panelTitleId}>
        Info
      </h2>

      <InfoSection id={`${panelTitleId}-file`} title="File">
        <InfoRow label="Name" value={selectedFile.fileName || "-"} />
        <InfoRow label="Size" value={formatBytes(selectedFile.fileSize)} />
        {metadata ? (
          <>
            {metadata.width != null || metadata.height != null ? (
              <InfoRow
                label="Dimensions"
                value={formatDimensions(metadata.width, metadata.height)}
              />
            ) : null}
            {metadata.dateTaken ? (
              <InfoRow
                label="Date Taken"
                value={formatDateTaken(metadata.dateTaken)}
              />
            ) : null}
          </>
        ) : null}
      </InfoSection>

      {hasCameraMetadata ? (
        <InfoSection id={`${panelTitleId}-camera`} title="Camera">
          {cameraLabel ? <InfoRow label="Body" value={cameraLabel} /> : null}
          {lensLabel ? <InfoRow label="Lens" value={lensLabel} /> : null}
        </InfoSection>
      ) : null}

      {hasExposureMetadata ? (
        <InfoSection id={`${panelTitleId}-exposure`} title="Exposure">
          {metadata?.iso != null ? (
            <InfoRow label="ISO" value={`ISO ${metadata.iso}`} />
          ) : null}
          {metadata?.shutterSpeed != null ? (
            <InfoRow
              label="Shutter"
              value={formatShutterSpeed(metadata.shutterSpeed)}
            />
          ) : null}
          {metadata?.aperture != null ? (
            <InfoRow
              label="Aperture"
              value={formatAperture(metadata.aperture)}
            />
          ) : null}
          {metadata?.focalLength != null ? (
            <InfoRow
              label="Focal Length"
              value={formatFocalLength(metadata.focalLength)}
            />
          ) : null}
          {metadata?.exposureBias != null ? (
            <InfoRow
              label="Exposure Bias"
              value={formatExposureBias(metadata.exposureBias)}
            />
          ) : null}
        </InfoSection>
      ) : null}

      {hasLocationMetadata ? (
        <InfoSection id={`${panelTitleId}-location`} title="Location">
          <InfoRow
            label="GPS"
            value={formatGPS(
              metadata?.gpsLatitude ?? null,
              metadata?.gpsLongitude ?? null,
            )}
          />
        </InfoSection>
      ) : null}

      {!metadata ? (
        <p className="rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2 text-[11px] leading-4 text-zinc-400">
          Camera metadata is unavailable for this photo.
        </p>
      ) : null}
    </aside>
  );
});
