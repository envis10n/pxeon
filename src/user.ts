const bcrypt = await import("https://deno.land/x/bcrypt@v0.3.0/mod.ts");
import { Client } from "./net/common.ts";
import User from "./database/models/user.ts";

export async function authenticate(client: Client): Promise<User> {
  const username = await client.prompt("Username: ");
  const user = await User.select().where(
    "username",
    username,
  )
    .first() as User | undefined;
  if (user == undefined) {
    const password = await client.prompt("Create a password: ");
    const password2 = await client.prompt("Re-type Password: ");
    if (password != password2) {
      client.send("Passwords did not match.");
      return await authenticate(client);
    } else {
      return await User.create({
        username,
        hash: await bcrypt.hash(password),
        last_login: new Date(),
        connection_chain: "",
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
