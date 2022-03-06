import {
  Database,
  PostgresConnector,
} from "https://deno.land/x/denodb@v1.0.40/mod.ts";
import User from "./models/user.ts";
import config from "../config.ts";

const log = console.log.bind("[DB]");

log("Connecting database...");

const _connection = new PostgresConnector({
  username: config.postgresql.username,
  password: config.postgresql.password,
  host: config.postgresql.hostname,
  database: config.postgresql.database,
  port: config.postgresql.port,
});

const _db = new Database(_connection);

log("Linking models...");

await _db.link([User]);

log("Synchronizing tables...");

await _db.sync();

log("Database loaded.");
