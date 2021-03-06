import { ICommand } from "../commands.ts";
import { ClientResult } from "../net/common.ts";
import { posix as _path } from "https://deno.land/std@0.128.0/path/mod.ts";
import arango, { getFilesystem } from "../database/database.ts";
import System from "../database/models/system.ts";

const systems = await arango.collection<System>("systems");

const command: ICommand = {
  name: "cd",
  description: "Change the current directory.",
  help: "{command.name} - {command.description}",
  uuid: crypto.randomUUID(),
  executor: async (process, ...args): Promise<ClientResult> => {
    try {
      let apath = args.join(" ").trim();
      if (apath == "~") {
        apath = `/home/${process.user.username}`;
      }
      if (apath == "") {
        return {
          command: command.name,
          stderr: "",
          stdout: "",
          code: 0,
        };
      }
      const chain = process.user.connection_chain.split(";");
      const sys_uuid = chain[chain.length - 1];
      const sys = await systems.findOne({ uuid: sys_uuid });
      if (sys == undefined) throw new Error("System not found.");
      const fs = await getFilesystem(sys._id);
      const npath = _path.isAbsolute(apath)
        ? apath
        : _path.resolve(process.env.cwd, apath);
      if (!await fs.exists(npath)) throw new Error("Path not found.");
      if (!(await fs.stat(npath)).isDirectory) {
        throw new Error("Path is not a directory.");
      }
      process.session.cwd = npath;
      return {
        command: command.name,
        stderr: "",
        stdout: "",
        code: 0,
      };
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
};

export default command;
