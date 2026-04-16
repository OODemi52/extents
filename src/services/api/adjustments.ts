import type { CommandArgs } from "@/types/commands";

import { invokeTauri } from "./_client";

export const updateExposure = (args: CommandArgs["update_exposure"]) =>
  invokeTauri("update_exposure", args);
