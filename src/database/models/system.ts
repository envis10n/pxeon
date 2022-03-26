import { Document } from "../database.ts";

export type SystemDoc = Document<System>;

export default interface System {
  uuid: string;
  filesystem: string;
}
