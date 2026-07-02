import type { ReactNode } from "react";

import { Allotment } from "allotment";

import { InteractionViewport } from "@/features/interaction-viewport/components/interaction-viewport";
import { EDIT_PANEL_DEFAULT_WIDTH, MAIN_MIN_WIDTH } from "@/store/layout-store";

const InspectorRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
    <span className="shrink-0">{label}</span>
    <span className="truncate text-zinc-200">{value}</span>
  </div>
);

const InspectorSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section>
    <div className="mb-2 text-sm text-zinc-300">{title}</div>
    <div className="space-y-2">{children}</div>
  </section>
);

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
          <aside className="mr-2 flex h-full flex-col gap-4 overflow-y-auto rounded-3xl border border-white/5 bg-[rgba(30,30,30,0.99)] p-4 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]">
            <div className="text-sm text-zinc-300">Inspector</div>

            <InspectorSection title="Image">
              <InspectorRow label="Source" value="-" />
              <InspectorRow label="Dimensions" value="-" />
              <InspectorRow label="Transparency" value="-" />
            </InspectorSection>

            <InspectorSection title="Pipeline">
              <InspectorRow label="Development" value="-" />
              <InspectorRow label="Display Intent" value="-" />
              <InspectorRow label="Base Exposure" value="-" />
            </InspectorSection>

            <InspectorSection title="Graph">
              <InspectorRow label="Source Texture" value="-" />
              <InspectorRow label="Working Texture" value="-" />
              <InspectorRow label="Display Texture" value="-" />
            </InspectorSection>

            <InspectorSection title="Timing">
              <InspectorRow label="Decode" value="-" />
              <InspectorRow label="Upload" value="-" />
              <InspectorRow label="Development" value="-" />
              <InspectorRow label="Presentation" value="-" />
            </InspectorSection>
          </aside>
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}
