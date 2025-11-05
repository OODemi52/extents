import { Accordion, AccordionItem } from "@heroui/accordion";
import { ExportIcon } from "@phosphor-icons/react";

import { EDIT_PANEL_ACCORDION_PROPS } from "@/features/edit-panel/utils/accordion";

export const GeometryPanel = () => {
  return (
    <Accordion
      {...EDIT_PANEL_ACCORDION_PROPS}
      defaultExpandedKeys={["geometry-crop"]}
    >
      <AccordionItem
        key="geometry-crop"
        aria-label="Crop & Transform"
        className="w-full rounded-xl bg-zinc-800"
        startContent={<ExportIcon />}
        title="Crop & Transform"
      >
        <div className="p-4 text-center text-sm text-zinc-500">
          Crop tools coming soon...
        </div>
      </AccordionItem>
    </Accordion>
  );
};
