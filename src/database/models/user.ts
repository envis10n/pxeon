import { Document } from "../database.ts";

export type UserDoc = Document<User>;

export default interface User {
  uuid: string;
  username: string;
  hash: string;
  group: string;
  last_login: string;
  home_system: string;
  connection_chain: string;
  created_at: string;
}
