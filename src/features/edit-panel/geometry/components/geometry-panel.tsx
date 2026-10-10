import { Accordion } from "@heroui/react";
import { ExportIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/ui/empty-state";
import { EditPanelSection } from "@/features/edit-panel/components/edit-panel-section";
import { EDIT_PANEL_ACCORDION_PROPS } from "@/features/edit-panel/utils/accordion";

export const GeometryPanel = () => {
  return (
    <Accordion
      {...EDIT_PANEL_ACCORDION_PROPS}
      defaultExpandedKeys={["geometry-crop"]}
    >
      <EditPanelSection
        icon={<ExportIcon />}
        id="geometry-crop"
        title="Crop & Transform"
      >
        <EmptyState compact title="Crop and transform unavailable" />
      </EditPanelSection>
    </Accordion>
  );
};
