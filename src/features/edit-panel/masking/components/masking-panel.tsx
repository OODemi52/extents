import { Accordion, AccordionItem } from "@heroui/accordion";
import { PaletteIcon } from "@phosphor-icons/react";

import { EDIT_PANEL_ACCORDION_PROPS } from "@/features/edit-panel/utils/accordion";

export const MaskingPanel = () => {
  return (
    <Accordion
      {...EDIT_PANEL_ACCORDION_PROPS}
      defaultExpandedKeys={["masking"]}
    >
      <AccordionItem
        key="masking"
        aria-label="Masking"
        className="w-full rounded-xl bg-zinc-800"
        startContent={<PaletteIcon />}
        title="Masking"
      >
        <div className="p-4 text-center text-sm text-zinc-500">
          Masking tools coming soon...
        </div>
      </AccordionItem>
    </Accordion>
  );
};
