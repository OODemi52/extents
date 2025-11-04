import { Accordion, AccordionItem } from "@heroui/accordion";
import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { RocketLaunchIcon, SunDimIcon } from "@phosphor-icons/react";
import { PaletteIcon } from "@phosphor-icons/react";
import { ExportIcon } from "@phosphor-icons/react";

import { CenteredSlider } from "./ui/sliders/center-slider";
import { ThemeSwitch } from "./theme-switch";

import { useLayoutStore } from "@/store/layout-store";

export function EditPanel() {
  const { activeEditTab } = useLayoutStore();

  return (
    <aside className="h-full bg-zinc-900/99 border border-white/15 rounded-xl flex flex-col p-2">
      <Card className="w-full h-32 mb-2 bg-zinc-800 text-center flex-shrink-0">
        Histogram Place Holder
      </Card>

      <ThemeSwitch />

      <div className="flex-1 overflow-y-auto rounded-xl bg-transparent min-h-0">
        <Accordion
          isCompact
          className="p-0"
          defaultExpandedKeys="all"
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
                  opacity: { ease: "easeInOut", duration: 1 },
                },
              },
              exit: {
                y: -10,
                opacity: 0,
                height: 0,
                overflowY: "hidden",
                transition: {
                  height: { ease: "easeInOut", duration: 0.25 },
                  opacity: { ease: "easeInOut", duration: 0.3 },
                },
              },
            },
          }}
          selectionMode="multiple"
          variant="splitted"
        >
          {(activeEditTab === "basic" || activeEditTab === "detail") && (
            <AccordionItem
              key="basic"
              aria-label="Basic Adjustments"
              className="w-full rounded-xl bg-zinc-800"
              startContent={<SunDimIcon />}
              title="basic"
            >
              <CenteredSlider label="Exposure" range={2} />
              <CenteredSlider label="Contrast" range={2} />
              <CenteredSlider label="Highlights" range={2} />
              <CenteredSlider label="Shadows" range={2} />
              <CenteredSlider label="Whites" range={1} />
              <CenteredSlider label="Blacks" range={1} />
            </AccordionItem>
          )}

          {(activeEditTab === "presets" || activeEditTab === "basic") && (
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
          )}

          {activeEditTab === "ai" && (
            <AccordionItem
              key="ai"
              aria-label="AI"
              className="w-full rounded-xl bg-zinc-800"
              startContent={<RocketLaunchIcon />}
              title="AI"
            >
              <div className="p-4 text-center text-sm text-zinc-500">
                Effects coming soon...
              </div>
            </AccordionItem>
          )}

          {activeEditTab === "crop" && (
            <AccordionItem
              key="crop"
              aria-label="Crop & Transform"
              className="w-full rounded-xl bg-zinc-800"
              startContent={<ExportIcon />}
              title="Crop"
            >
              <div className="p-4 text-center text-sm text-zinc-500">
                Crop tools coming soon...
              </div>
            </AccordionItem>
          )}
        </Accordion>
      </div>

      <div className="flex flex-row gap-2 pt-2 flex-shrink-0">
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
