import { ICommand } from "../commands.ts";
import { ClientResult } from "../net/common.ts";

const command: ICommand = {
  name: "echo",
  description: "Echo the input.",
  help: "{command.name} - {command.description}",
  uuid: crypto.randomUUID(),
  executor: async (process, ...args): Promise<ClientResult> => {
    return await new Promise((resolve, reject) => {
      const env = process.env;
      let res = args.join(" ");
      for (const k of Object.keys(env)) {
        res = res.replaceAll(`$${k.toUpperCase()}`, env[k]);
      }
      resolve({
        command: command.name,
        stderr: "",
        stdout: res,
        code: 0,
      });
    });
  },
};

export default command;
