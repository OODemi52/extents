import { Accordion, AccordionItem } from "@heroui/accordion";
import { SunDimIcon, PaletteIcon } from "@phosphor-icons/react";

import { CenteredSlider } from "@/components/ui/sliders/center-slider";
import { EDIT_PANEL_ACCORDION_PROPS } from "@/features/edit-panel/utils/accordion";

export const BasicAdjustmentsPanel = () => {
  return (
    <Accordion
      {...EDIT_PANEL_ACCORDION_PROPS}
      defaultExpandedKeys={["basic-adjustments", "color-grading"]}
    >
      <AccordionItem
        key="basic-adjustments"
        aria-label="Basic Adjustments"
        className="w-full rounded-xl bg-zinc-800"
        startContent={<SunDimIcon />}
        title="Basic Adjustments"
      >
        <CenteredSlider label="Exposure" range={2} />
        <CenteredSlider label="Contrast" range={2} />
        <CenteredSlider label="Highlights" range={2} />
        <CenteredSlider label="Shadows" range={2} />
        <CenteredSlider label="Whites" range={1} />
        <CenteredSlider label="Blacks" range={1} />
      </AccordionItem>

      <AccordionItem
        key="color-grading"
        aria-label="Color Grading"
        className="w-full rounded-xl bg-zinc-800"
        startContent={<PaletteIcon />}
        title="Color Grading"
      >
        <CenteredSlider
          label="White Balance"
          range={2}
          trackColor="bg-linear-to-r from-blue-500 to-yellow-500"
        />
        <CenteredSlider
          label="Tint"
          range={2}
          trackColor="bg-linear-to-r from-green-500 to-pink-500"
        />
        <CenteredSlider label="Vibrance" range={2} />
        <CenteredSlider label="Saturation" range={2} />
      </AccordionItem>
    </Accordion>
  );
};
