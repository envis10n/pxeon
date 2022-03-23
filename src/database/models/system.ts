import { Document, getFilesystem } from "../database.ts";
import { MockFilesystem } from "../../filesystem.ts";

export type SystemDoc = Document<System>;

export default interface System {
  uuid: string;
}
