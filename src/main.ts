import { NetManager } from "./net/common.ts";
import telnet from "./net/telnet.ts";
import websocket from "./net/websocket.ts";

const manager = new NetManager(
  telnet({ hostname: "localhost", port: 3000 }),
  websocket({ hostname: "localhost", port: 13337 }),
);

manager.events.connect.attach((client) => {
  console.log(`[Net.${client.parent}]`, client.uuid, "connected.");
  client.events.command.attach((ev) => {
    console.log(`[Net.${client.parent}]`, client.uuid, "command:", ev.command);
    client.respond({
      command: ev.command,
      stderr: "Command does not exist.",
      stdout: "",
      code: 1,
    });
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
