import { NetManager } from "./net/common.ts";
import telnet from "./net/telnet.ts";

const manager = new NetManager(telnet({ hostname: "localhost", port: 3000 }));

manager.events.connect.attach((client) => {
  console.log(`[Net.${client.parent}]`, client.uuid, "connected.");
  client.events.command.attach((ev) => {
    console.log(`[Net.${client.parent}]`, client.uuid, "command:", ev.command);
    client.respond({
      command: ev.command,
      stdout: "Command does not exist.",
      stderr: "",
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
