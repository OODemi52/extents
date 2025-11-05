import { Accordion, AccordionItem } from "@heroui/accordion";
import { RocketLaunchIcon } from "@phosphor-icons/react";

import { EDIT_PANEL_ACCORDION_PROPS } from "@/features/edit-panel/utils/accordion";

export const AiPanel = () => {
  return (
    <Accordion {...EDIT_PANEL_ACCORDION_PROPS} defaultExpandedKeys={["ai"]}>
      <AccordionItem
        key="ai"
        aria-label="AI"
        className="w-full rounded-xl bg-zinc-800"
        startContent={<RocketLaunchIcon />}
        title="AI Enhancements"
      >
        <div className="p-4 text-center text-sm text-zinc-500">
          AI enhancements coming soon...
        </div>
      </AccordionItem>
    </Accordion>
  );
};
