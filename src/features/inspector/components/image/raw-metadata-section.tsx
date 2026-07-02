import type { RawImageInspection, RectInspection } from "@/types/inspection";

import { InspectorRow } from "../shared/inspector-row";
import { InspectorSection } from "../shared/inspector-section";

import { formatDimensions } from "@/lib/formatters";

export const RawMetadataSection = ({
  raw,
}: {
  raw: RawImageInspection | null;
}) => {
  if (!raw) {
    return null;
  }

  return (
    <InspectorSection title="RAW Source">
      <InspectorRow label="Camera" value={formatCamera(raw)} />
      <InspectorRow label="Bit Depth" value={`${raw.bitsPerSample}-bit`} />
      <InspectorRow
        label="Sensor"
        value={formatDimensions(
          raw.sensorDimensions.width,
          raw.sensorDimensions.height,
        )}
      />
      <InspectorRow label="Crop" value={formatRect(raw.cropArea)} />
      <InspectorRow label="CFA" value={raw.cfa.name} />
      <InspectorRow
        label="Black"
        value={formatNumberList(raw.sourceBlackLevels, 0)}
      />
      <InspectorRow
        label="White"
        value={formatNumberList(raw.sourceWhiteLevels, 0)}
      />
      <InspectorRow
        label="Norm Black"
        value={formatNumberList(raw.normalizedBlackLevels, 4)}
      />
      <InspectorRow
        label="Norm White"
        value={formatNumberList(raw.normalizedWhiteLevels, 4)}
      />
      <InspectorRow
        label="WB As Shot"
        value={formatNumberList(raw.asShotWhiteBalance, 3)}
      />
      <InspectorRow
        label="WB Headroom"
        value={formatNumberList(raw.headroomWhiteBalance, 3)}
      />
    </InspectorSection>
  );
};

const formatCamera = (raw: RawImageInspection) => {
  const camera = [raw.cameraMake, raw.cameraModel].filter(Boolean).join(" ");

  return camera || "-";
};

const formatRect = (rect: RectInspection) =>
  `${formatDimensions(rect.width, rect.height)} @ ${rect.x}, ${rect.y}`;

const formatNumberList = (values: number[], fractionDigits: number) =>
  values
    .map((value) =>
      Number.isFinite(value) ? value.toFixed(fractionDigits) : "-",
    )
    .join(" / ");
