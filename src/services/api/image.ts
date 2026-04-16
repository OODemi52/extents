import type { CommandArgs, CommandReturn } from "@/types/commands";

import { invokeTauri } from "./_client";

export type PreviewInfo = CommandReturn["prepare_preview"];

export const preparePreview = (args: CommandArgs["prepare_preview"]) =>
  invokeTauri("prepare_preview", args);

export const getHistogram = (args: CommandArgs["get_histogram"]) =>
  invokeTauri("get_histogram", args);
