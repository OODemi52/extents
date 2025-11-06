import { invokeTauri } from "./_client";

import { CommandReturn } from "@/types/commands";

export type PreviewInfo = CommandReturn["prepare_preview"];

export const preparePreview = (path: string): Promise<PreviewInfo> => {
  return invokeTauri("prepare_preview", { path });
};
