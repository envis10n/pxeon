import { Client, ClientEventType, NetServer } from "./common.ts";
import {
  CompatTable,
  escapeIAC,
  EventType,
  TelnetParser,
  unescapeIAC,
} from "https://deno.land/x/denotel@0.1.6/mod.ts";
import { iterateReader } from "https://deno.land/std@0.126.0/streams/conversion.ts";
import { Evt } from "https://deno.land/x/evt@v1.10.2/mod.ts";

export default function (opts: Deno.ListenOptions): NetServer {
  const listener = Deno.listen(opts);
  const compat = new CompatTable();
  const clients: Evt<Client> = new Evt();
  return {
    id: "Telnet",
    clients,
    init: async () => {
      const log = console.log.bind(null, "[Telnet]");
      log("Listening on", `${opts.hostname || "127.0.0.1"}:${opts.port}...`);
      for await (const conn of listener) {
        const uuid = crypto.randomUUID();
        const parser = new TelnetParser(512, compat.clone());
        let running_command = false;
        const client: Client = {
          uuid,
          events: {
            close: new Evt(),
            command: new Evt(),
            input: new Evt(),
            error: new Evt(),
          },
          write: async (chunk): Promise<number> => {
            return await conn.write(escapeIAC(chunk));
          },
          send: async (text): Promise<number> => {
            return await conn.write(escapeIAC(new TextEncoder().encode(text)));
          },
          respond: async (res): Promise<number> => {
            if (!running_command) return 0;
            const data = res.stderr.length > 0 ? res.stderr : res.stdout;
            running_command = false;
            return await conn.write(escapeIAC(new TextEncoder().encode(data)));
          },
          print: async (ev): Promise<number> => {
            return await conn.write(
              escapeIAC(new TextEncoder().encode(ev.data)),
            );
          },
          close: conn.close,
        };
        clients.post(client);
        try {
          for await (const chunk of iterateReader(conn)) {
            const events = parser.receive(chunk);

            for (const ev of events.filter((e) => e.type == EventType.Send)) {
              await client.write(ev.buffer);
            }

            for (const ev of events.filter((e) => e.type == EventType.Normal)) {
              if (running_command) {
                // consider it input
                client.events.input.post({
                  type: ClientEventType.Input,
                  data: new TextDecoder().decode(unescapeIAC(ev.buffer)),
                });
              } else {
                // consider it a command
                running_command = true;
                const command = new TextDecoder().decode(
                  unescapeIAC(ev.buffer),
                );
                client.events.command.post({
                  type: ClientEventType.Command,
                  command,
                });
                setTimeout(() => {
                  if (running_command) {
                    client.respond({
                      code: 1,
                      stderr: "Command timeout.",
                      stdout: "",
                      command: "",
                    }).catch((_e) => {});
                  }
                }, 30000);
              }
            }
          }
        } catch (e) {
          client.events.error.post(e);
        } finally {
          client.events.close.post();
        }
      }
    },
  };
}
