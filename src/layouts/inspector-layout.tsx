import { Allotment } from "allotment";

import { InspectorPanel } from "@/features/inspector/components/inspector-panel";
import { InteractionViewport } from "@/features/interaction-viewport/components/interaction-viewport";
import { EDIT_PANEL_DEFAULT_WIDTH, MAIN_MIN_WIDTH } from "@/store/layout-store";

export function InspectorLayout() {
  return (
    <div className="h-full">
      <Allotment
        className="h-full allotment-shell"
        proportionalLayout={false}
        separator={false}
        vertical={false}
      >
        <Allotment.Pane minSize={MAIN_MIN_WIDTH}>
          <InteractionViewport />
        </Allotment.Pane>
        <Allotment.Pane
          maxSize={EDIT_PANEL_DEFAULT_WIDTH}
          minSize={EDIT_PANEL_DEFAULT_WIDTH}
          preferredSize={EDIT_PANEL_DEFAULT_WIDTH}
        >
          <InspectorPanel />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}
