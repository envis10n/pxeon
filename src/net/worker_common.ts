import {
  Client,
  ClientCommandEvent,
  ClientInputEvent,
  ClientPrintEvent,
  ClientResult,
} from "./common.ts";

export enum WorkerEventType {
  Connect,
  Data,
  Error,
  Disconnect,
  Incoming,
  Outgoing,
  Init,
}

export interface WorkerContext<T = any> {
  onmessage: (ev: MessageEvent<T>) => void;
  onerror: (ev: ErrorEvent) => void;
  postMessage: (data: T) => void;
}

export type DedicatedWorkerContext<T = any> = WorkerContext<T>;

export type WorkerConnectEvent = {
  type: WorkerEventType.Connect;
  payload: {
    uuid: string;
  };
};

export type WorkerDisconnectEvent = {
  type: WorkerEventType.Disconnect;
  payload: {
    uuid: string;
  };
};

export type WorkerDataEvent = {
  type: WorkerEventType.Data;
  payload: {
    uuid: string;
    data: string | ArrayBuffer;
  };
};

export type WorkerErrorEvent = {
  type: WorkerEventType.Error;
  payload: {
    uuid: string;
    error: string;
  };
};

export type WorkerOutgoingEvent = {
  type: WorkerEventType.Outgoing;
  payload: {
    uuid: string;
    event: ClientPrintEvent | ClientResult;
  };
};

export type WorkerIncomingEvent = {
  type: WorkerEventType.Incoming;
  payload: {
    uuid: string;
    event: ClientCommandEvent | ClientInputEvent;
  };
};

export type WorkerInitEvent = {
  type: WorkerEventType.Init;
  payload: {
    hostname?: string;
    port: number;
  };
};

export type WorkerEvent =
  | WorkerConnectEvent
  | WorkerDisconnectEvent
  | WorkerDataEvent
  | WorkerErrorEvent
  | WorkerInitEvent
  | WorkerIncomingEvent
  | WorkerOutgoingEvent;
