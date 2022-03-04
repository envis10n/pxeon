import {
  Database,
  DataTypes,
  Model,
  PostgresConnector,
} from "https://deno.land/x/denodb@v1.0.40/mod.ts";
import User from "./models/user.ts";

const log = console.log.bind("[DB]");

log("Connecting database...");

const _connection = new PostgresConnector({
  username: "pxeon",
  password: "pxeon",
  host: "localhost",
  database: "pxeon",
});

const _db = new Database(_connection);

log("Linking models...");

await _db.link([User]);

log("Synchronizing tables...");

await _db.sync();

log("Database loaded.");
