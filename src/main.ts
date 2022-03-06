import { NetManager, NetServer } from "./net/common.ts";
import commands from "./commands.ts";
import { authenticate } from "./user.ts";
import { ISession } from "./session.ts";
import config from "./config.ts";

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
  user.last_login = new Date();
  await user.update();
  await client.send("Welcome to Project XEON, " + user.username + ".");
  client.events.command.attach(async (ev) => {
    log(client.uuid, "command:", ev.command);
    const cmds = ev.command.split(" ");
    const cmd = commands.get(cmds[0]);
    if (cmd != undefined) {
      cmd.executor({
        env: {
          user: user.username,
          group: user.group,
          uuid: user.uuid,
          cwd: session.cwd,
        },
        user,
        session,
      }, ...cmds.slice(1)).then(async (res) => {
        res.command = ev.command;
        await client.respond(res);
        await client.send(_buildPrompt());
      }).catch(async (e) => {
        await client.respond({
          command: ev.command,
          stderr: e.message,
          stdout: "",
          code: 1,
        });
        await client.send(_buildPrompt());
      });
    } else {
      await client.respond({
        command: ev.command,
        stderr: "Command does not exist.",
        stdout: "",
        code: 1,
      });
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
