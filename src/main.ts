import { ClientResult, NetManager, NetServer } from "./net/common.ts";
import commands from "./commands.ts";
import { authenticate } from "./user.ts";
import { ISession } from "./session.ts";
import config from "./config.ts";
import { posix as _path } from "https://deno.land/std@0.130.0/path/mod.ts";
import arango, { getFilesystem } from "./database/database.ts";
import System from "./database/models/system.ts";

type NetServerFactory = (opts: Deno.ListenOptions) => NetServer;

const _listeners: { factory: NetServerFactory; opts: Deno.ListenOptions }[] =
  [];

if (config.listeners != undefined) {
  for (const def of config.listeners) {
    const factory: NetServerFactory =
      (await import(`./net/${def.file}`)).default;
    _listeners.push(
      { factory, opts: { hostname: def.hostname, port: def.port } },
    );
  }
}

if (_listeners.length == 0) {
  console.error("No listeners defined in configuration file. Aborting...");
  Deno.exit(1);
}

const manager = new NetManager(
  ..._listeners.map((l) => l.factory(l.opts)),
);

manager.events.connect.attach(async (client) => {
  const log = console.log.bind(`[Net.${client.parent}]`);
  log(client.uuid, "connected.");
  const user = await authenticate(client);
  const session: ISession = {
    uuid: user.uuid,
    cwd: `/home/${user.username}`,
  };
  const _buildPrompt = (): string =>
    `${user.username}:${
      session.cwd == `/home/${user.username}` ? "~" : session.cwd
    }$ `;
  log(client.uuid, "authenticated as:", user.username);
  user.last_login = new Date().toISOString();
  await user.update();
  await client.send("Welcome to Project XEON, " + user.username + ".");
  await client.send(_buildPrompt());
  client.events.command.attach(async (ev) => {
    const _sys_ids = user.connection_chain.split(";");
    const _sys_id = _sys_ids[_sys_ids.length - 1];
    log(client.uuid, "command:", ev.command);
    const _ctemp = ev.command.split(">").map((v) => v.trim());
    ev.command = _ctemp[0];
    const _cmds = ev.command.split("|").map((c) => c.trim());
    const _result: {
      stdout: string;
      stderr: string;
      result: ClientResult | null;
    } = {
      stderr: "",
      stdout: "",
      result: null,
    };
    for (const _cmd of _cmds) {
      const cmds = _cmd.split(" ");
      const cmd = commands.get(cmds[0]);
      if (cmd != undefined) {
        try {
          const args: string[] = _result.result == null
            ? cmds.slice(1)
            : _result.result.stdout.split(" ");
          const res = await cmd.executor({
            env: {
              user: user.username,
              group: user.group,
              uuid: user.uuid,
              cwd: session.cwd,
            },
            user,
            session,
          }, ...args);
          res.command = _cmd;
          _result.result = res;
        } catch (e) {
          _result.result = {
            stderr: e.message,
            stdout: "",
            code: 1,
            command: _cmd,
          };
          break;
        }
      } else {
        // TODO: Find executable in system's /bin folder.
        _result.result = {
          command: ev.command,
          stderr: "Command does not exist.",
          stdout: "",
          code: 1,
        };
        break;
      }
    }
    if (_result.result != null) {
      if (_ctemp.length > 1) {
        try {
          const _npath = _path.isAbsolute(_ctemp[1])
            ? _ctemp[1]
            : _path.resolve(session.cwd, _ctemp[1]);
          const sys = await (await arango.collection<System>("systems"))
            .findOne(
              { uuid: _sys_id },
            );
          if (sys == undefined) throw new Error("System not found.");
          const fs = await getFilesystem(sys._id);
          await fs.write(_npath, _result.result.stdout);
          await client.respond({
            code: 0,
            command: _result.result.command,
            stderr: "",
            stdout: "",
          });
        } catch (e) {
          await client.respond({
            code: 1,
            command: _result.result.command,
            stderr: e.message,
            stdout: "",
          });
        }
      } else {
        await client.respond(_result.result);
      }
      await client.send(_buildPrompt());
    }
  });
  client.events.input.attach((ev) => {
    log(client.uuid, "stdin:", ev.data);
  });
});

manager.events.disconnect.attach(({ client, error }) => {
  if (error) {
    console.log(`[Net.${client.parent}]`, client.uuid, "client error:", error);
  }
  console.log(`[Net.${client.parent}]`, client.uuid, "disconnected.");
});

await import("./database/database.ts");
await import("./commands.ts");
