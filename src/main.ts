import { NetManager } from "./net/common.ts";
import telnet from "./net/telnet.ts";

const manager = new NetManager(telnet({ hostname: "localhost", port: 3000 }));

manager.events.connect.attach((client) => {
  console.log("[Net]", client.uuid, "connected.");
  client.events.command.attach((ev) => {
    console.log("[Net]", client.uuid, "command:", ev.command);
    client.respond({
      command: ev.command,
      stdout: "Command does not exist.",
      stderr: "",
      code: 1,
    });
  });
  client.events.input.attach((ev) => {
    console.log("[Net]", client.uuid, "stdin:", ev.data);
  });
});

manager.events.disconnect.attach(({ uuid, error }) => {
  if (error) {
    console.log("[Net]", uuid, "client error:", error);
  }
  console.log("[Net]", uuid, "disconnected.");
});
