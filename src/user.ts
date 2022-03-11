const bcrypt = await import("https://deno.land/x/bcrypt@v0.3.0/mod.ts");
import { Client } from "./net/common.ts";
import arango, { Document } from "./database/database.ts";
import User from "./database/models/user.ts";

const users = await arango.collection<User>("users");

export async function authenticate(client: Client): Promise<Document<User>> {
  const username = await client.prompt("Username: ");
  const user = await users.findOne({ username });
  if (user == undefined) {
    const password = await client.prompt("Create a password: ");
    const password2 = await client.prompt("Re-type Password: ");
    if (password != password2) {
      client.send("Passwords did not match.");
      return await authenticate(client);
    } else {
      return await users.create({
        uuid: crypto.randomUUID(),
        hash: await bcrypt.hash(password),
        group: username,
        username,
        last_login: new Date().toISOString(),
        connection_chain: "",
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
