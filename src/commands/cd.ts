import { ICommand } from "../commands.ts";
import { ClientResult } from "../net/common.ts";
import { posix as _path } from "https://deno.land/std@0.128.0/path/mod.ts";

const command: ICommand = {
  name: "cd",
  description: "Change the current directory.",
  help: "{command.name} - {command.description}",
  uuid: crypto.randomUUID(),
  executor: async (process, ...args): Promise<ClientResult> => {
    return await new Promise((resolve, reject) => {
      try {
        const npath = _path.resolve(process.env.cwd, args[0] || ".");
        process.session.cwd = npath;
        resolve({
          command: command.name,
          stderr: "",
          stdout: "",
          code: 0,
        });
      } catch (e) {
        reject(e);
      }
    });
  },
};

export default command;
