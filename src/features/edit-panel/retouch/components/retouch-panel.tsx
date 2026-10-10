import { Accordion } from "@heroui/react";
import { SunDimIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/ui/empty-state";
import { EditPanelSection } from "@/features/edit-panel/components/edit-panel-section";
import { EDIT_PANEL_ACCORDION_PROPS } from "@/features/edit-panel/utils/accordion";

export const RetouchPanel = () => {
  return (
    <Accordion
      {...EDIT_PANEL_ACCORDION_PROPS}
      defaultExpandedKeys={["retouch-detail"]}
    >
      <EditPanelSection
        icon={<SunDimIcon />}
        id="retouch-detail"
        title="Detail & Retouch"
      >
        <EmptyState compact title="Detail and retouch unavailable" />
      </EditPanelSection>
    </Accordion>
  );
};
