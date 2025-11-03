import { invoke } from "@tauri-apps/api/core";

import { CommandArgs, CommandReturn } from "@/types/commands";

export async function invokeTauri<TCmd extends keyof CommandArgs>(
  ...args: CommandArgs[TCmd] extends undefined
    ? [command: TCmd]
    : [command: TCmd, args: CommandArgs[TCmd]]
): Promise<CommandReturn[TCmd]> {
  const [command, commandArgs] = args;

  try {
    return (await invoke(command, commandArgs as any)) as CommandReturn[TCmd];
  } catch (error) {
    throw `[${command}, ${args}]: ${error}`;
  }
}
