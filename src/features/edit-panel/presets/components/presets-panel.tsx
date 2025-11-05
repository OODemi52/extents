import { Accordion, AccordionItem } from "@heroui/accordion";
import { PaletteIcon } from "@phosphor-icons/react";

import { EDIT_PANEL_ACCORDION_PROPS } from "@/features/edit-panel/utils/accordion";

export const PresetsPanel = () => {
  return (
    <Accordion
      {...EDIT_PANEL_ACCORDION_PROPS}
      defaultExpandedKeys={["presets"]}
    >
      <AccordionItem
        key="presets"
        aria-label="Presets"
        className="w-full rounded-xl bg-zinc-800"
        startContent={<PaletteIcon />}
        title="Presets"
      >
        <div className="p-4 text-center text-sm text-zinc-500">
          Presets coming soon...
        </div>
      </AccordionItem>
    </Accordion>
  );
};
