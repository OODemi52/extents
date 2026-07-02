import type { TimingInspection } from "@/types/inspection";

import { InspectorRow } from "../shared/inspector-row";
import { InspectorSection } from "../shared/inspector-section";

import { formatMilliseconds } from "@/lib/formatters";

export const TimingInspectionSection = ({
  timings,
}: {
  timings: TimingInspection | null;
}) => (
  <InspectorSection title="Timing">
    <InspectorRow
      label="Input Build"
      value={formatMilliseconds(timings?.inputBuildMs)}
    />
  </InspectorSection>
);
