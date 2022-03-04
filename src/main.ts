import { NetManager } from "./net/common.ts";
import telnet from "./net/telnet.ts";
import websocket from "./net/websocket.ts";
import commands from "./commands.ts";
import { authenticate } from "./user.ts";

const manager = new NetManager(
  telnet({ hostname: "localhost", port: 3000 }),
  websocket({ hostname: "localhost", port: 13337 }),
);

manager.events.connect.attach(async (client) => {
  const log = console.log.bind(`[Net.${client.parent}]`);
  log(client.uuid, "connected.");
  const user = await authenticate(client);
  log(client.uuid, "authenticated as:", user.username);
  user.last_login = new Date();
  await user.update();
  await client.send("Welcome to Project XEON, " + user.username + ".");
  client.events.command.attach((ev) => {
    console.log(`[Net.${client.parent}]`, client.uuid, "command:", ev.command);
    const cmds = ev.command.split(" ");
    const cmd = commands.get(cmds[0]);
    if (cmd != undefined) {
      cmd.executor({
        user: "root",
        group: "root",
        uuid: client.uuid,
        cwd: "/home/root",
      }, ...cmds.slice(1)).then((res) => {
        res.command = ev.command;
        client.respond(res);
      }).catch((e) => {
        client.respond({
          command: ev.command,
          stderr: e.message,
          stdout: "",
          code: 1,
        });
      });
    } else {
      client.respond({
        command: ev.command,
        stderr: "Command does not exist.",
        stdout: "",
        code: 1,
      });
    }
  });
  client.events.input.attach((ev) => {
    console.log(`[Net.${client.parent}]`, client.uuid, "stdin:", ev.data);
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
