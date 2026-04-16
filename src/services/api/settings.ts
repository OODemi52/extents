import type { CommandArgs } from "@/types/commands";

import { invokeTauri } from "./_client";

export const getCacheSize = (args: CommandArgs["get_cache_size"]) =>
  invokeTauri("get_cache_size", args);

export const clearCache = (args: CommandArgs["clear_cache"]) =>
  invokeTauri("clear_cache", args);
