import config from "../config.ts";
import {
  Arango,
  Graph,
} from "https://raw.githubusercontent.com/envis10n/darango/6f342fc5db2c6694ebe25c8fdb1987c977e17c95/mod.ts";
export * from "https://raw.githubusercontent.com/envis10n/darango/6f342fc5db2c6694ebe25c8fdb1987c977e17c95/mod.ts";
import {
  defaultFilesystem,
  MockAccess,
  MockEntry,
  MockFilesystem,
  MockFS,
  MockFSConnector,
  MockPermissions,
} from "../filesystem.ts";

import FSEntry, { FSEntryDir } from "./models/fsentry.ts";

type EdgeBase<T = Record<never, never>> = {
  _to: string;
  _from: string;
} & T;

export class ArangoFSConnector implements MockFSConnector {
  constructor(
    private readonly arango: Arango,
    public readonly sys_id: string,
  ) {}
  public async retrieve(path: string): Promise<MockEntry> {
    const res = await (await this.arango.graph("files")).traversal<FSEntry>(
      this.sys_id,
      "INBOUND",
      {
        prune: { path },
        filter: { path },
      },
    ).collect();
    const doc = res.find((d) => d.path == path);
    if (res.length == 0 || doc == undefined) {
      throw new Error("Path not found.");
    }
    const permissions: MockAccess = {
      read: MockPermissions(doc.permissions.read),
      write: MockPermissions(doc.permissions.write),
      execute: MockPermissions(doc.permissions.execute),
    };
    if (doc.type == "FILE") {
      return {
        type: doc.type,
        permissions,
        created_at: doc.created_at,
        last_modified: doc.last_modified,
        encoding: doc.encoding,
        contents: new Uint8Array(doc.contents),
      };
    } else {
      return {
        type: doc.type,
        permissions,
        created_at: doc.created_at,
        last_modified: doc.last_modified,
      };
    }
  }
  public async place(path: string, entry: MockEntry): Promise<void> {
    const res = await (await this.arango.graph("files")).traversal<FSEntry>(
      this.sys_id,
      "INBOUND",
      {
        prune: { path },
        filter: { path },
      },
    ).collect();
    const filesystems = await this.arango.collection<FSEntry>("filesystems");
    const edges = await this.arango.collection<EdgeBase>("files_to_system");
    const doc = res.find((d) => d.path == path);
    const ndoc_base: FSEntryDir = {
      type: "DIRECTORY",
      path,
      permissions: {
        read: entry.permissions.read.bits,
        write: entry.permissions.write.bits,
        execute: entry.permissions.execute.bits,
      },
      created_at: entry.created_at,
      last_modified: entry.last_modified,
    };
    const ndoc_entry = entry.type == "FILE"
      ? Object.assign(ndoc_base, {
        type: "FILE",
        contents: [...entry.contents],
        encoding: entry.encoding,
      })
      : ndoc_base;
    if (res.length == 0 || doc == undefined) {
      // Create document and link to system.
      const ndoc = await filesystems.create(
        ndoc_entry,
      );
      await edges.create({
        _to: this.sys_id,
        _from: ndoc._id,
      });
    } else {
      const udoc = await filesystems.get(doc._key);
      Object.assign(udoc, ndoc_entry);
      await udoc.update();
    }
  }
  public async contains(path: string): Promise<boolean> {
    const res = await (await this.arango.graph("files")).traversal<FSEntry>(
      this.sys_id,
      "INBOUND",
      {
        prune: { path },
        filter: { path },
      },
    ).collect();
    const doc = res.find((d) => d.path == path);
    return !(res.length == 0 || doc == undefined);
  }
}

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

export async function createFilesystem(
  user: string,
  system: string,
): Promise<MockFilesystem> {
  const def_fs = defaultFilesystem(user);
  const conn = new ArangoFSConnector(arango, system);
  for (const path of Object.keys(def_fs)) {
    const entry = def_fs[path];
    await conn.place(path, entry);
  }
  return new MockFilesystem(conn);
}

export function getFilesystem(key: string): MockFilesystem {
  try {
    const conn = new ArangoFSConnector(
      arango,
      key,
    );
    return new MockFilesystem(conn);
  } catch (_) {
    throw new Error("Document not found.");
  }
}

log("Synchronizing collections...");

await sync(...config.arangodb.collections);

export default arango;
