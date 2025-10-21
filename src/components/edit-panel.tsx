import { Accordion, AccordionItem } from "@heroui/accordion";
import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { RocketLaunchIcon, SunDimIcon } from "@phosphor-icons/react";
import { PaletteIcon } from "@phosphor-icons/react";
import { ExportIcon } from "@phosphor-icons/react";

import { useImageEdits } from "../store/image-edits";

import { CenteredSlider } from "./ui/sliders/center-slider";
import { ThemeSwitch } from "./theme-switch";

export function EditPanel() {
  const { brightness, contrast } = useImageEdits();

  return (
    <aside className="bg-zinc-900/99 border border-white/15 rounded-xl flex flex-col min-w-68 w-68 my-2 mr-2 py-2 px-2">
      <Card className="w-full h-32 mb-2 bg-zinc-800 text-center">
        Histogram Place Holder
      </Card>
      <ThemeSwitch />

      <div className="flex-1 overflow-y-auto rounded-xl bg-transparent">
        <Accordion
          isCompact
          className="p-0"
          defaultExpandedKeys={["1", "2", "3"]}
          itemClasses={{
            base: "px-2 m-0",
            content: "",
            title: "text-sm tracking-tight",
          }}
          motionProps={{
            variants: {
              enter: {
                y: 0,
                opacity: 1,
                height: "auto",
                overflowY: "unset",
                transition: {
                  height: {
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    duration: 1,
                  },
                  opacity: { easings: "ease", duration: 1 },
                },
              },
              exit: {
                y: -10,
                opacity: 0,
                height: 0,
                overflowY: "hidden",
                transition: {
                  height: { easings: "ease", duration: 0.25 },
                  opacity: { easings: "ease", duration: 0.3 },
                },
              },
            },
          }}
          selectionMode="multiple"
          variant="splitted"
        >
          <AccordionItem
            key="1"
            aria-label="Light Adjustments"
            className="w-full rounded-xl bg-zinc-800"
            startContent={<SunDimIcon />}
            title="Light"
          >
            <CenteredSlider label="Exposure" range={2} />
            <CenteredSlider label="Contrast" range={2} />
            <CenteredSlider label="Highlights" range={2} />
            <CenteredSlider label="Shadows" range={2} />
            <CenteredSlider label="Whites" range={1} />
            <CenteredSlider label="Blacks" range={1} />
          </AccordionItem>

          <AccordionItem
            key="2"
            aria-label="Color Adjustments"
            className="w-full rounded-xl bg-zinc-800"
            startContent={<PaletteIcon />}
            title="Color"
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

          <AccordionItem
            key="3"
            aria-label="Light Adjustments"
            className="w-full rounded-xl bg-zinc-800"
            startContent={<SunDimIcon />}
            title="Light"
          >
            <CenteredSlider label="Exposure" range={2} />
            <CenteredSlider label="Contrast" range={2} />
            <CenteredSlider label="Highlights" range={2} />
            <CenteredSlider label="Shadows" range={2} />
            <CenteredSlider label="Whites" range={1} />
            <CenteredSlider label="Blacks" range={1} />
          </AccordionItem>
        </Accordion>
      </div>

      <div className="flex flex-row gap-2 sticky bottom-0 py-2">
        <Button
          className="rounded-md w-full shadow-md"
          color="default"
          size="sm"
          startContent={<RocketLaunchIcon />}
        >
          Export
        </Button>
        <Button
          isIconOnly
          className="rounded-md shadow-md"
          color="default"
          size="sm"
          startContent={<ExportIcon />}
        />
      </div>
    </aside>
  );
}
