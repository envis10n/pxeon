import { ICommand } from "../commands.ts";
import { ClientResult } from "../net/common.ts";
import { posix as _path } from "https://deno.land/std@0.128.0/path/mod.ts";
import arango, { getFilesystem } from "../database/database.ts";
import System from "../database/models/system.ts";

const systems = await arango.collection<System>("systems");

const command: ICommand = {
  name: "ls",
  description: "List everything in the directory.",
  help: "{command.name} - {command.description}",
  uuid: crypto.randomUUID(),
  executor: async (process, ...args): Promise<ClientResult> => {
    try {
      args = args.map((a) => a == "~" ? `/home/${process.user.username}` : a);
      const chain = process.user.connection_chain.split(";");
      const sys_uuid = chain[chain.length - 1];
      const sys = await systems.findOne({ uuid: sys_uuid });
      if (sys == undefined) throw new Error("System not found.");
      const fs = await getFilesystem(sys._id);
      const npath = args.length == 0
        ? process.env.cwd
        : _path.isAbsolute(args.join(" "))
        ? args.join(" ")
        : _path.resolve(process.env.cwd, args[0] || ".");
      if (!await fs.exists(npath)) throw new Error("Path not found.");
      if (!(await fs.stat(npath)).isDirectory) {
        throw new Error("Path is not a directory.");
      }
      const dirlist = await fs.readdir(npath);
      return {
        command: command.name,
        stderr: "",
        stdout: dirlist.join("\n"),
        code: 0,
      };
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
};

export default command;
