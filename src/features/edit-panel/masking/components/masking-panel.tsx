import { Accordion } from "@heroui/react";
import { PaletteIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/ui/empty-state";
import { EditPanelSection } from "@/features/edit-panel/components/edit-panel-section";
import { EDIT_PANEL_ACCORDION_PROPS } from "@/features/edit-panel/utils/accordion";

export const MaskingPanel = () => {
  return (
    <Accordion
      {...EDIT_PANEL_ACCORDION_PROPS}
      defaultExpandedKeys={["masking"]}
    >
      <EditPanelSection icon={<PaletteIcon />} id="masking" title="Masking">
        <EmptyState compact title="Masking unavailable" />
      </EditPanelSection>
    </Accordion>
  );
};
