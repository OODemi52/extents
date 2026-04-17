import type { CommandArgs } from "@/types/commands";

import { invokeTauri } from "./_client";

export const getExifMetadata = (args: CommandArgs["get_exif_metadata"]) =>
  invokeTauri("get_exif_metadata", args);
