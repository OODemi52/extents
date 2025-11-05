import { Accordion, AccordionItem } from "@heroui/accordion";
import { SunDimIcon } from "@phosphor-icons/react";

import { EDIT_PANEL_ACCORDION_PROPS } from "@/features/edit-panel/utils/accordion";

export const RetouchPanel = () => {
  return (
    <Accordion
      {...EDIT_PANEL_ACCORDION_PROPS}
      defaultExpandedKeys={["retouch-detail"]}
    >
      <AccordionItem
        key="retouch-detail"
        aria-label="Detail & Retouch"
        className="w-full rounded-xl bg-zinc-800"
        startContent={<SunDimIcon />}
        title="Detail & Retouch"
      >
        <div className="p-4 text-center text-sm text-zinc-500">
          Detail tools coming soon...
        </div>
      </AccordionItem>
    </Accordion>
  );
};
