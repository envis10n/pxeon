// deno-lint-ignore-file
import { ICommand } from "../commands.ts";
import { ClientResult } from "../net/common.ts";

const command: ICommand = {
  name: "echo",
  description: "Echo the input.",
  help: "{command.name} - {command.description}",
  uuid: crypto.randomUUID(),
  executor: async (env, ...args): Promise<ClientResult> => {
    let res = args.join(" ");
    for (const k of Object.keys(env)) {
      res = res.replaceAll(`$${k.toUpperCase()}`, env[k]);
    }
    return {
      command: "echo",
      stderr: "",
      stdout: res,
      code: 0,
    };
  },
};

export default command;
