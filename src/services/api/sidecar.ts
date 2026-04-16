import type { CommandArgs } from "@/types/commands";

import { invokeTauri } from "./_client";

export const loadSidecar = (args: CommandArgs["load_sidecar"]) =>
  invokeTauri("load_sidecar", args);

export const saveSidecar = (args: CommandArgs["save_sidecar"]) =>
  invokeTauri("save_sidecar", args);
