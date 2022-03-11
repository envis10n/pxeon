import config from "../config.ts";
import { Arango } from "https://deno.land/x/darango@0.0.4/mod.ts";
export * from "https://deno.land/x/darango@0.0.4/mod.ts";

const log = console.log.bind("[DB]");

log("Connecting to database...");

const arango = await Arango.basicAuth({
  uri: config.arangodb.uri,
  username: config.arangodb.username,
  password: config.arangodb.password,
});

export async function sync(...collections: string[]) {
  for (const collection of collections) {
    try {
      await arango.createCollection(collection);
      log("Created collection:", collection);
    } catch (_e) {
      log("Collection", collection, "already exists. Skipping.");
    }
  }
}

log("Synchronizing collections...");

await sync(...config.arangodb.collections);

export default arango;
