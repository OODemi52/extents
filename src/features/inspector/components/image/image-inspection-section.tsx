import type { ImageInspection } from "@/types/inspection";

import { CompactInspectorValue } from "../shared/inspector-row";
import { InspectorSection } from "../shared/inspector-section";

import { CfaPatternGrid } from "./cfa-pattern-grid";
import { RasterSourceSquare } from "./raster-source-square";

import { formatBoolean, formatDimensions } from "@/lib/formatters";

export const ImageInspectionSection = ({
  image,
}: {
  image: ImageInspection | null;
}) => (
  <InspectorSection title="Image">
    <div className="flex items-start gap-3">
      {image?.raw?.cfa ? (
        <CfaPatternGrid cfa={image.raw.cfa} />
      ) : (
        <RasterSourceSquare hasImage={Boolean(image)} />
      )}
      <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
        <CompactInspectorValue
          label="Source"
          value={image?.sourceKind ?? "-"}
        />
        <CompactInspectorValue
          label="Dimensions"
          value={formatDimensions(image?.width, image?.height)}
        />
        <CompactInspectorValue
          label="Transparency"
          value={formatBoolean(image?.hasTransparency)}
        />
      </div>
    </div>
  </InspectorSection>
);
