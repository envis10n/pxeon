const bcrypt = await import("https://deno.land/x/bcrypt@v0.3.0/mod.ts");
import { Client } from "./net/common.ts";
import arango, { createFilesystem } from "./database/database.ts";
import User, { UserDoc } from "./database/models/user.ts";
import System from "./database/models/system.ts";

const users = await arango.collection<User>("users");
const systems = await arango.collection<System>("systems");

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
