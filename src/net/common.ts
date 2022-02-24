import { Evt } from "https://deno.land/x/evt@v1.10.2/mod.ts";

export enum ClientEventType {
  Command,
  Input,
  Print,
  Result,
}

export type ClientBaseEvent = {
  type: ClientEventType;
};

export type ClientCommandEvent = {
  type: ClientEventType.Command;
  command: string;
} & ClientBaseEvent;

export type ClientResult = {
  command: string;
  stdout: string;
  stderr: string;
  code: number;
};

export type ClientPrintEvent = {
  type: ClientEventType.Print;
  data: string;
} & ClientBaseEvent;

export type ClientInputEvent =
  & {
    type: ClientEventType.Input;
    data: string;
  }
  & ClientBaseEvent;

export type ClientEvent =
  | ClientBaseEvent
  | ClientInputEvent
  | ClientCommandEvent
  | ClientPrintEvent;

export interface Client {
  uuid: string;
  parent: string;
  events: {
    close: Evt<void>;
    command: Evt<ClientCommandEvent>;
    input: Evt<ClientInputEvent>;
    error: Evt<Error>;
  };
  write(chunk: Uint8Array): Promise<number>;
  send(text: string): Promise<number>;
  respond(result: ClientResult): Promise<number>;
  print(ev: ClientPrintEvent): Promise<number>;
  close(): void;
}

export interface ServerEvents {
  connect: Evt<Client>;
  disconnect: Evt<{ client: Client; error?: Error }>;
}

export interface NetServer {
  id: string;
  clients: Evt<Client>;
  init(logger: (...args: any[]) => void): Promise<void>;
}

export class NetManager {
  public servers: Map<string, NetServer> = new Map();
  public events: ServerEvents = {
    connect: new Evt(),
    disconnect: new Evt(),
  };
  public clients: Map<string, Client> = new Map();
  constructor(...servers: NetServer[]) {
    for (const server of servers) {
      this.servers.set(server.id, server);
      server.clients.attach((client) => {
        this.clients.set(client.uuid, client);
        let error_: Error;
        client.events.error.attach((err) => {
          error_ = err;
        });
        client.events.close.attach(() => {
          this.clients.delete(client.uuid);
          this.events.disconnect.post({ client, error: error_ });
        });
        this.events.connect.post(client);
      });
      server.init(console.log.bind(null, `[Net.${server.id}]`)).catch((e) => {
        console.error("Server error:", e);
      }).finally(() => {
        this.servers.delete(server.id);
      });
    }
  }
  public async broadcastText(
    data: string,
    exclude?: string[],
  ): Promise<number> {
    let total = 0;
    for (const [uuid, client] of this.clients) {
      if (
        exclude != undefined && exclude.find((ex) => ex == uuid) == undefined
      ) {
        total += await client.send(data);
      }
    }
    return total;
  }
  public async broadcast(
    data: Uint8Array,
    exclude?: string[],
  ): Promise<number> {
    let total = 0;
    for (const [uuid, client] of this.clients) {
      if (
        exclude != undefined && exclude.find((ex) => ex == uuid) == undefined
      ) {
        total += await client.write(data);
      }
    }
    return total;
  }
}
