// deno-lint-ignore-file require-await
import {
  Client,
  ClientEventType,
  ClientPrintEvent,
  ClientResult,
  isPrintEvent,
  NetServer,
} from "./common.ts";
import { Evt } from "https://deno.land/x/evt@v1.10.2/mod.ts";

import {
  WorkerConnectEvent,
  WorkerDataEvent,
  WorkerDisconnectEvent,
  WorkerErrorEvent,
  WorkerEvent,
  WorkerEventType,
  WorkerIncomingEvent,
  WorkerInitEvent,
  WorkerOutgoingEvent,
} from "./worker_common.ts";

export default function (
  specifier: string | URL,
  opts: Deno.ListenOptions,
  worker_id: string,
): NetServer {
  const CLIENT_MAP: Map<string, Client> = new Map();
  const clients = new Evt<Client>();
  const listen_id = "Worker-" + worker_id;
  return {
    id: listen_id,
    clients,
    init: async (log) => {
      return await new Promise((resolve, reject) => {
        try {
          log("Starting worker:", worker_id);
          const proc = new Worker(specifier, {
            type: "module",
            deno: { namespace: true },
          });
          const postInit = (ev: WorkerInitEvent) => {
            proc.postMessage(ev);
          };
          const postOutgoing = (
            uuid: string,
            event: ClientPrintEvent | ClientResult,
          ) => {
            const ev: WorkerOutgoingEvent = {
              type: WorkerEventType.Outgoing,
              payload: {
                uuid,
                event,
              },
            };
            proc.postMessage(ev);
          };
          const postClose = (uuid: string) => {
            const ev: WorkerDisconnectEvent = {
              type: WorkerEventType.Disconnect,
              payload: {
                uuid,
              },
            };
            proc.postMessage(ev);
          };
          const postData = (uuid: string, data: string | Uint8Array) => {
            const ev: WorkerDataEvent = {
              type: WorkerEventType.Data,
              payload: {
                uuid,
                data,
              },
            };
            proc.postMessage(ev);
          };
          proc.onerror = async (e) => {
            log("Error:", e);
            resolve();
          };
          proc.onmessage = (ev: MessageEvent<WorkerEvent>) => {
            const { data } = ev;
            switch (data.type) {
              case WorkerEventType.Incoming: {
                const ev = data.payload.event;
                const uuid = data.payload.uuid;
                const client = CLIENT_MAP.get(uuid);
                if (client != undefined) {
                  if (ev.type == ClientEventType.Command) {
                    client.events.command.post(ev);
                  } else {
                    client.events.input.post(ev);
                  }
                }
                break;
              }
              case WorkerEventType.Disconnect: {
                const uuid = data.payload.uuid;
                const client = CLIENT_MAP.get(uuid);
                if (client != undefined) {
                  client.events.close.post();
                  CLIENT_MAP.delete(uuid);
                }
                break;
              }
              case WorkerEventType.Error: {
                const uuid = data.payload.uuid;
                const emsg = data.payload.error;
                const client = CLIENT_MAP.get(uuid);
                if (client != undefined) {
                  client.events.error.post(new Error(emsg));
                }
                break;
              }
              case WorkerEventType.Connect: {
                const client: Client = {
                  uuid: data.payload.uuid,
                  parent: listen_id,
                  events: {
                    command: new Evt(),
                    close: new Evt(),
                    input: new Evt(),
                    error: new Evt(),
                  },
                  close: async () => {
                    postClose(data.payload.uuid);
                  },
                  send: async (_text): Promise<number> => {
                    postData(data.payload.uuid, _text);
                    return 0;
                  },
                  write: async (_data): Promise<number> => {
                    postData(data.payload.uuid, _data);
                    return 0;
                  },
                  respond: async (res): Promise<number> => {
                    postOutgoing(data.payload.uuid, res);
                    return 0;
                  },
                  print: async (ev): Promise<number> => {
                    postOutgoing(data.payload.uuid, ev);
                    return 0;
                  },
                };
                CLIENT_MAP.set(data.payload.uuid, client);
                clients.post(client);
                break;
              }
            }
          };
          postInit({
            type: WorkerEventType.Init,
            payload: { hostname: opts.hostname, port: opts.port },
          });
        } catch (_err) {
          reject(_err);
        }
      });
    },
  };
}
