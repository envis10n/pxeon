import { Client, ClientEventType, NetServer } from "./common.ts";
import { Evt } from "https://deno.land/x/evt@v1.10.2/mod.ts";

import {
  WorkerConnectEvent,
  WorkerDataEvent,
  WorkerDisconnectEvent,
  WorkerErrorEvent,
  WorkerEvent,
  WorkerEventBase,
  WorkerEventType,
  WorkerInitEvent,
} from "./worker_common.ts";

export default function (
  specifier: string | URL,
  opts: Deno.ListenOptions,
): NetServer {
  const clients = new Evt<Client>();
  const _id = specifier instanceof URL ? specifier.href : specifier;
  return {
    id: "Worker-" + _id,
    clients,
    init: async (log) => {
      log("Starting worker:", _id);
      const proc = new Worker(specifier, {
        type: "module",
        deno: { namespace: true },
      });
      const postInit = (ev: WorkerInitEvent) => {
        proc.postMessage(ev);
      };
      proc.onmessage = (ev: MessageEvent<WorkerEvent>) => {
        console.log("DEBUG", typeof ev.data, ev.data);
        if (ev.data.type == WorkerEventType.Init) {
          proc.terminate();
        }
      };
      postInit({
        type: WorkerEventType.Init,
        payload: { hostname: opts.hostname, port: opts.port },
      });
    },
  };
}
