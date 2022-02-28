export enum WorkerEventType {
  Connect,
  Data,
  Error,
  Disconnect,
  Init,
}

export interface WorkerContext<T = any> {
  onmessage: (ev: MessageEvent<T>) => void;
  onerror: (ev: ErrorEvent) => void;
  postMessage: (data: T) => void;
}

export type DedicatedWorkerContext<T = any> =
  & WorkerContext<T>
  & Window
  & typeof globalThis;

export interface WorkerEventBase {
  type: WorkerEventType;
  payload?: {
    [key: string]: string | number | boolean | ArrayBuffer | undefined;
  };
}

export type WorkerConnectEvent = {
  type: WorkerEventType.Connect;
  payload: {
    uuid: string;
  };
} & WorkerEventBase;

export type WorkerDisconnectEvent = {
  type: WorkerEventType.Disconnect;
  payload: {
    uuid: string;
  };
} & WorkerEventBase;

export type WorkerDataEvent = {
  type: WorkerEventType.Data;
  payload: {
    uuid: string;
    data: string | ArrayBuffer;
  };
} & WorkerEventBase;

export type WorkerErrorEvent = {
  type: WorkerEventType.Error;
  payload: {
    uuid: string;
    error: string;
  };
} & WorkerEventBase;

export type WorkerInitEvent = {
  type: WorkerEventType.Init;
  payload: {
    hostname?: string;
    port: number;
  };
} & WorkerEventBase;

export type WorkerEvent =
  | WorkerEventBase
  | WorkerConnectEvent
  | WorkerDisconnectEvent
  | WorkerDataEvent
  | WorkerErrorEvent
  | WorkerInitEvent;
