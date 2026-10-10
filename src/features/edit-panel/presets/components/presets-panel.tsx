import { Accordion } from "@heroui/react";
import { PaletteIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/ui/empty-state";
import { EditPanelSection } from "@/features/edit-panel/components/edit-panel-section";
import { EDIT_PANEL_ACCORDION_PROPS } from "@/features/edit-panel/utils/accordion";

export const PresetsPanel = () => {
  return (
    <Accordion
      {...EDIT_PANEL_ACCORDION_PROPS}
      defaultExpandedKeys={["presets"]}
    >
      <EditPanelSection icon={<PaletteIcon />} id="presets" title="Presets">
        <EmptyState compact title="Presets unavailable" />
      </EditPanelSection>
    </Accordion>
  );
};
