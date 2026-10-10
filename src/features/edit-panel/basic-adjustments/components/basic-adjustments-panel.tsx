import { Accordion } from "@heroui/react";
import { SunDimIcon, PaletteIcon } from "@phosphor-icons/react";

import { CenteredSlider } from "@/components/ui/sliders/center-slider";
import { useExposureAdjustment } from "@/features/edit-panel/basic-adjustments/hooks/use-exposure-adjustment";
import { EditPanelSection } from "@/features/edit-panel/components/edit-panel-section";
import { EDIT_PANEL_ACCORDION_PROPS } from "@/features/edit-panel/utils/accordion";

const TONAL_TRACK = "bg-linear-to-r from-zinc-700 to-zinc-500";

type BasicAdjustmentsPanelProps = {
  active?: boolean;
};

export const BasicAdjustmentsPanel = ({
  active = true,
}: BasicAdjustmentsPanelProps) => {
  const { exposureEv, setExposure } = useExposureAdjustment(active);

  return (
    <Accordion
      {...EDIT_PANEL_ACCORDION_PROPS}
      defaultExpandedKeys={["basic-adjustments", "color-grading"]}
    >
      <EditPanelSection
        icon={<SunDimIcon />}
        id="basic-adjustments"
        title="Basic Adjustments"
      >
        <CenteredSlider
          defaultValue={exposureEv}
          label="Exposure"
          range={5}
          trackColor={TONAL_TRACK}
          onValueChange={(exposureEv) => {
            setExposure(exposureEv);
          }}
        />
        <CenteredSlider label="Contrast" range={2} trackColor={TONAL_TRACK} />
        <CenteredSlider label="Highlights" range={2} trackColor={TONAL_TRACK} />
        <CenteredSlider label="Shadows" range={2} trackColor={TONAL_TRACK} />
        <CenteredSlider label="Whites" range={1} trackColor={TONAL_TRACK} />
        <CenteredSlider label="Blacks" range={1} trackColor={TONAL_TRACK} />
      </EditPanelSection>

      <EditPanelSection
        isDisabled
        icon={<PaletteIcon />}
        id="color-grading"
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
      </EditPanelSection>
    </Accordion>
  );
};
