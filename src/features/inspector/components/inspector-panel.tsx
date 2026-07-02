import { GraphInspectionSection } from "./graph/graph-inspection-section";
import { ImageInspectionSection } from "./image/image-inspection-section";
import { PipelineInspectionSection } from "./pipeline/pipeline-inspection-section";
import { TimingInspectionSection } from "./timing/timing-inspection-section";

import { useRendererInspection } from "@/features/inspector/hooks/use-renderer-inspection";

export function InspectorPanel() {
  const { snapshot, isLoading, error } = useRendererInspection();
  const image = snapshot?.image ?? null;
  const pipeline = snapshot?.pipeline ?? null;
  const textures = snapshot?.textures ?? null;
  const timings = snapshot?.timings ?? null;

  return (
    <aside className="mr-2 flex h-full flex-col gap-4 overflow-y-auto rounded-3xl border border-white/5 bg-[rgba(30,30,30,0.99)] p-4 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]">
      <div className="text-sm text-zinc-300">Inspector</div>

      {isLoading ? (
        <div className="text-xs text-zinc-500">Reading renderer state...</div>
      ) : null}

      {error ? <div className="text-xs text-red-400">{error}</div> : null}

      <ImageInspectionSection image={image} />
      <PipelineInspectionSection pipeline={pipeline} />
      <GraphInspectionSection textures={textures} />
      <TimingInspectionSection timings={timings} />
    </aside>
  );
}
