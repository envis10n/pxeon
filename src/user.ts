const bcrypt = await import("https://deno.land/x/bcrypt@v0.3.0/mod.ts");
import { Client } from "./net/common.ts";
import arango, { createFilesystem } from "./database/database.ts";
import User, { UserDoc } from "./database/models/user.ts";
import System from "./database/models/system.ts";
import FSEntry from "./database/models/fsentry.ts";

const users = await arango.collection<User>("users");
const systems = await arango.collection<System>("systems");
const filesystems = await arango.collection<FSEntry>("filesystems");

export async function removeUser(username: string): Promise<boolean> {
  const user = await users.findOne({ username });
  if (user == undefined) return false;
  const system = await systems.findOne({ uuid: user.home_system });
  if (system == undefined) return false;
  const fs_id = system.filesystem;
  const root = await filesystems.findOne({ _id: fs_id });
  if (root == undefined) return false;
  const graph = await arango.graph("files");
  const files =
    await (await graph.traversal<FSEntry>(fs_id, "OUTBOUND", { limit: 500 }))
      .collect();
  for (const file of files) {
    const f = await filesystems.get(file._key);
    if (!await f.delete()) return false;
  }
  if (!await root.delete()) return false;
  if (!await system.delete()) return false;
  if (!await user.delete()) return false;
  return true;
}

export async function createUser(
  username: string,
  password: string,
): Promise<UserDoc> {
  const fs = await createFilesystem(username);
  const sys = await systems.create({
    uuid: crypto.randomUUID(),
    filesystem: fs.connector.root_id,
  });
  return await users.create({
    uuid: crypto.randomUUID(),
    hash: await bcrypt.hash(password),
    group: username,
    username,
    last_login: new Date().toISOString(),
    connection_chain: sys.uuid,
    home_system: sys.uuid,
    created_at: new Date().toISOString(),
  });
}

export async function authenticate(client: Client): Promise<UserDoc> {
  const username = await client.prompt("Username: ");
  const user = await users.findOne({ username });
  if (user == undefined) {
    const password = await client.prompt("Create a password: ");
    const password2 = await client.prompt("Re-type Password: ");
    if (password != password2) {
      client.send("Passwords did not match.");
      return await authenticate(client);
    } else {
      return await createUser(username, password);
    }
  } else {
    const password = await client.prompt("Password: ");
    if (await bcrypt.compare(password, user.hash as string)) {
      return user;
    } else {
      client.send("Incorrect password.");
      return await authenticate(client);
    }
  }
}
