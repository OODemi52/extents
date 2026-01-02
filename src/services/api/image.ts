import { invokeTauri } from "./_client";

import type { HistogramData } from "@/types/histogram";
import { CommandReturn } from "@/types/commands";

export type PreviewInfo = CommandReturn["prepare_preview"];
export type { HistogramData };

export const preparePreview = (path: string): Promise<PreviewInfo> => {
  return invokeTauri("prepare_preview", { path });
};

export const getHistogram = (path: string): Promise<HistogramData> => {
  return invokeTauri("get_histogram", { path });
};
