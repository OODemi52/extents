import type { PipelineInspection } from "@/types/inspection";

import { InspectorRow } from "../shared/inspector-row";
import { InspectorSection } from "../shared/inspector-section";

import { formatEv } from "@/lib/formatters";

export const PipelineInspectionSection = ({
  pipeline,
}: {
  pipeline: PipelineInspection | null;
}) => (
  <InspectorSection title="Pipeline">
    <InspectorRow
      label="Development"
      value={pipeline?.developmentSource ?? "-"}
    />
    <InspectorRow
      label="Display Intent"
      value={pipeline?.displayIntent ?? "-"}
    />
    <InspectorRow
      label="Base Exposure"
      value={formatEv(pipeline?.baseExposureEv)}
    />
    <InspectorRow
      label="User Exposure"
      value={formatEv(pipeline?.userExposureEv)}
    />
  </InspectorSection>
);
