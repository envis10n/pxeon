import { Document, getFilesystem } from "../database.ts";
import { MockFilesystem } from "../../filesystem.ts";

export type SystemDoc = Document<System>;

export default interface System {
  uuid: string;
  /** Document ID for this system's filesystem. */
  filesystem: string;
}

export async function getSystemFS(sys: SystemDoc): Promise<MockFilesystem> {
  return await getFilesystem(sys.filesystem);
}
