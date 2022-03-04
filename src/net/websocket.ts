import { Client, ClientEventType, NetServer } from "./common.ts";
import { Evt } from "https://deno.land/x/evt@v1.10.2/mod.ts";

export default function (opts: Deno.ListenOptions): NetServer {
  const listener = Deno.listen(opts);
  const clients = new Evt<Client>();
  return {
    clients,
    init: async (log) => {
      log("Listening on", `${opts.hostname || "localhost"}:${opts.port}...`);
      for await (const conn of listener) {
        const http = Deno.serveHttp(conn);
        const e = await http.nextRequest();
        if (e != null) {
          const { socket, response } = Deno.upgradeWebSocket(e.request);
          const uuid = crypto.randomUUID();
          let command_running = false;
          let command_timeout: number | null = null;
          const client: Client = {
            uuid,
            parent: "WebSocket",
            prompt_resolver: null,
            events: {
              close: new Evt(),
              command: new Evt(),
              input: new Evt(),
              error: new Evt(),
            },
            close: () => {
              socket.close();
            },
            prompt: async (question): Promise<string> => {
              return await new Promise((resolve, reject) => {
                try {
                  client.prompt_resolver = (response) => {
                    client.prompt_resolver = null;
                    resolve(response);
                  };
                  client.print({ type: ClientEventType.Print, data: question })
                    .catch((e) => {
                      client.prompt_resolver = null;
                      throw e;
                    });
                } catch (e) {
                  reject(e);
                }
              });
            },
            respond: (result) => {
              return new Promise((resolve, reject) => {
                if (!command_running) resolve(0);
                else {
                  command_running = false;
                  if (command_timeout != null) {
                    clearTimeout(command_timeout);
                    command_timeout = null;
                  }
                  const data = JSON.stringify({ type: "result", data: result });
                  try {
                    socket.send(data);
                    resolve(new TextEncoder().encode(data).byteLength);
                  } catch (e) {
                    reject(e);
                  }
                }
              });
            },
            print: (ev) => {
              return new Promise((resolve, reject) => {
                const data = JSON.stringify({ type: "print", data: ev.data });
                try {
                  socket.send(data);
                  resolve(new TextEncoder().encode(data).byteLength);
                } catch (e) {
                  reject(e);
                }
              });
            },
            write: (chunk) => {
              return new Promise((resolve, reject) => {
                try {
                  socket.send(chunk);
                  resolve(chunk.byteLength);
                } catch (e) {
                  reject(e);
                }
              });
            },
            send: (text) => {
              return new Promise((resolve, reject) => {
                try {
                  const t = JSON.stringify({ type: "send", data: text });
                  socket.send(t);
                  resolve(new TextEncoder().encode(t).byteLength);
                } catch (e) {
                  reject(e);
                }
              });
            },
          };
          clients.post(client);
          socket.onclose = () => {
            client.events.close.post();
          };
          socket.onerror = (ev) => {
            client.events.error.post(new Error((ev as ErrorEvent).message));
          };
          socket.onmessage = (ev) => {
            const data: string | ArrayBuffer = ev.data;
            const message: string = typeof data == "string"
              ? data
              : new TextDecoder().decode(data);
            if (client.prompt_resolver != null) {
              client.prompt_resolver(message);
            } else if (!command_running) {
              // command
              command_running = true;
              command_timeout = setTimeout(() => {
                if (!command_running) return;
                client.respond({
                  command: message,
                  code: 1,
                  stdout: "",
                  stderr: "Command timeout.",
                });
              }, 30000);
              client.events.command.post({
                command: message,
                type: ClientEventType.Command,
              });
            } else {
              // input
              client.events.input.post({
                type: ClientEventType.Input,
                data: message,
              });
            }
          };
          e.respondWith(response);
        }
      }
    },
    id: "WebSocket",
  };
}
