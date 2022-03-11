import { ClientResult } from "./net/common.ts";
import * as _path from "https://deno.land/std@0.128.0/path/mod.ts";
import User from "./database/models/user.ts";
import { ISession } from "./session.ts";

export async function loadCommand(filename: string): Promise<ICommand> {
  const mod = await import(`./commands/${filename}`) as { default: ICommand };
  return mod.default;
}

export interface IEnv {
  [key: string]: string;
  cwd: string;
  user: string;
  uuid: string;
  group: string;
}

export interface ICommand {
  name: string;
  uuid: string;
  description: string;
  help: string;
  executor(
    process: { user: User; env: IEnv; session: ISession },
    ...args: string[]
  ): Promise<ClientResult>;
}

export function printHelp(command: ICommand): string {
  return command.help.replaceAll("{command.name}", command.name).replaceAll(
    "{command.description}",
    command.description,
  ).replaceAll("{command.uuid}", command.uuid);
}

const log = console.log.bind("[Commands]");

const COMMAND_MAP: Map<string, ICommand> = new Map();

log("Loading commands...");

for await (const f of Deno.readDir(_path.resolve(Deno.cwd(), "src/commands"))) {
  const cmd = await loadCommand(f.name);
  COMMAND_MAP.set(cmd.name, cmd);
  log("Loaded:", cmd.name);
}

log(COMMAND_MAP.size, "command(s) loaded.");

export default COMMAND_MAP;
