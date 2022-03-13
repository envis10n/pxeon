import { Document } from "../database.ts";

export type SystemDoc = Document<System>;

export default interface System {
  uuid: string;
  /** Document ID for this system's filesystem. */
  filesystem: string;
}
