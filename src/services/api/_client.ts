import { invoke } from "@tauri-apps/api/core";

import { CommandArgs, CommandReturn } from "@/types/commands";

/**
 * Typed wrapper for Tauri's `invoke` function.
 * This provides a single, centralized place for logging and error handling.
 */
export async function invokeTauri<TCmd extends keyof CommandArgs>(
  ...args: CommandArgs[TCmd] extends undefined
    ? [command: TCmd]
    : [command: TCmd, args: CommandArgs[TCmd]]
): Promise<CommandReturn[TCmd]> {
  const [command, commandArgs] = args;

  try {
    // We cast the result to the looked-up type.
    return (await invoke(command, commandArgs as any)) as CommandReturn[TCmd];
  } catch (error) {
    throw `[${command}, ${args}]: ${error}`;
  }
}
