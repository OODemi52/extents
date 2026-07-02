import type { TextureInspection } from "@/types/inspection";

import { InspectorRow } from "../shared/inspector-row";
import { InspectorSection } from "../shared/inspector-section";

import { formatDimensions } from "@/lib/formatters";

export const GraphInspectionSection = ({
  textures,
}: {
  textures: TextureInspection | null;
}) => (
  <InspectorSection title="Graph">
    <InspectorRow label="Source" value={formatTexture(textures?.source)} />
    <InspectorRow
      label="Development"
      value={formatTexture(textures?.developmentOutput)}
    />
    <InspectorRow
      label="Adjustment"
      value={formatTexture(textures?.adjustmentOutput)}
    />
    <InspectorRow
      label="Display"
      value={formatTexture(textures?.displayOutput)}
    />
    <InspectorRow label="Surface" value={formatTexture(textures?.surface)} />
  </InspectorSection>
);

const formatTexture = (
  texture:
    | {
        format: string;
        width: number;
        height: number;
      }
    | undefined,
) => {
  if (!texture) {
    return "-";
  }

  return `${texture.format} / ${formatDimensions(texture.width, texture.height)}`;
};
