import { Accordion } from "@heroui/react";
import { RocketLaunchIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/ui/empty-state";
import { EditPanelSection } from "@/features/edit-panel/components/edit-panel-section";
import { EDIT_PANEL_ACCORDION_PROPS } from "@/features/edit-panel/utils/accordion";

export const AiPanel = () => {
  return (
    <Accordion {...EDIT_PANEL_ACCORDION_PROPS} defaultExpandedKeys={["ai"]}>
      <EditPanelSection
        icon={<RocketLaunchIcon />}
        id="ai"
        title="AI Enhancements"
      >
        <EmptyState compact title="AI enhancements unavailable" />
      </EditPanelSection>
    </Accordion>
  );
};
