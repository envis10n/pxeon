export default interface User {
  uuid: string;
  username: string;
  hash: string;
  group: string;
  last_login: string;
  connection_chain: string;
  created_at: string;
}
