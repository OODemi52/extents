import type { CommandArgs } from "@/types/commands";

import { invokeTauri } from "./_client";

export const setRatings = (args: CommandArgs["set_ratings"]) =>
  invokeTauri("set_ratings", args);

export const setFlags = (args: CommandArgs["set_flags"]) =>
  invokeTauri("set_flags", args);

export const getAnnotations = (args: CommandArgs["get_annotations"]) =>
  invokeTauri("get_annotations", args);
