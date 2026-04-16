import type { CommandArgs } from "@/types/commands";

import { invokeTauri } from "./_client";

export const get = (args: CommandArgs["get_thumbnail"]) =>
  invokeTauri("get_thumbnail", args);

export const prefetch = (args: CommandArgs["prefetch_thumbnails"]) =>
  invokeTauri("prefetch_thumbnails", args);
