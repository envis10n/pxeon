import config from "../config.ts";
import { Arango } from "https://deno.land/x/darango@0.1.6/mod.ts";
export * from "https://deno.land/x/darango@0.1.6/mod.ts";
import { EdgeDefinition } from "https://deno.land/x/darango@0.1.6/graph.ts";
import {
  defaultFilesystem,
  MockAccess,
  MockEntry,
  MockFilesystem,
  MockFSConnector,
  MockPermissions,
} from "../filesystem.ts";
import { posix as _path } from "https://deno.land/std@0.130.0/path/mod.ts";

import FSEntry, { FSEntryDir } from "./models/fsentry.ts";
import System from "./models/system.ts";

type EdgeBase<T = Record<never, never>> = {
  _to: string;
  _from: string;
} & T;

export class ArangoFSConnector implements MockFSConnector {
  constructor(
    private readonly arango: Arango,
    public readonly root_id: string,
  ) {}
  private async getPathID(path: string): Promise<string> {
    if (path == "/") return this.root_id;
    const res = await (await this.arango.graph("files")).traversal<FSEntry>(
      this.root_id,
      "OUTBOUND",
      {
        prune: { path },
        filter: { path },
        limit: 500,
      },
    ).collect();
    if (res.length == 0) throw new Error("Path not found.");
    return res[0]._id;
  }
  private async getDir(path: string): Promise<string> {
    if (path == "/") return this.root_id;
    const parsed = _path.parse(path);
    const parent = parsed.dir;
    return await this.getPathID(parent);
  }
  public async recurse(path: string): Promise<string[]> {
    const parent = await this.getPathID(path);
    const res = await (await this.arango.graph("files")).traversal<FSEntry>(
      parent,
      "OUTBOUND",
      {
        limit: 1,
        min: 1,
      },
    ).collect();
    const rec = res.map((e) => _path.parse(e.path).base);
    return rec;
  }
  public async retrieve(path: string): Promise<MockEntry> {
    const parent = await this.getDir(path);
    const res = await (await this.arango.graph("files")).traversal<FSEntry>(
      parent,
      "OUTBOUND",
      {
        prune: { path },
        filter: { path },
        limit: 500,
      },
    ).collect();
    const doc = path == "/"
      ? await (await this.arango.collection<FSEntry>("filesystems")).findOne({
        _id: this.root_id,
      })
      : res.find((d) => d.path == path);
    if (doc == undefined) {
      throw new Error("Path not found: " + path);
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
    const parent = await this.getDir(path);
    const res = await (await this.arango.graph("files")).traversal<FSEntry>(
      parent,
      "OUTBOUND",
      {
        prune: { path },
        filter: { path },
        limit: 500,
      },
    ).collect();
    const filesystems = await this.arango.collection<FSEntry>("filesystems");
    const edges = await this.arango.collection<EdgeBase>("file_links");
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
        _to: ndoc._id,
        _from: parent,
      });
    } else {
      const udoc = await filesystems.get(
        doc._key,
      );
      Object.assign(udoc, ndoc_entry);
      await udoc.update();
    }
  }
  public async contains(path: string): Promise<boolean> {
    if (path == "/") return true;
    const parent = await this.getDir(path);
    const res = await (await this.arango.graph("files")).traversal<FSEntry>(
      this.root_id,
      "OUTBOUND",
      {
        prune: { path },
        filter: { path },
        limit: 500,
      },
    ).collect();
    const doc = parent == "/"
      ? await (await this.arango.collection<FSEntry>("filesystems")).findOne({
        _id: this.root_id,
      })
      : res.find((d) => d.path == path);
    return res.length != 0 && doc != undefined;
  }
}

const log = console.log.bind("[DB]");

log("Connecting to database...");

const arango = await Arango.basicAuth({
  uri: config.arangodb.uri,
  username: config.arangodb.username,
  password: config.arangodb.password,
});

export interface CollectionConfigBase {
  name: string;
  type: "collection" | "edge" | "graph";
}

export type CollectionConfig = CollectionConfigBase & {
  type: "collection";
};

export type GraphConfig = CollectionConfigBase & {
  type: "graph";
  edgeDefinitions: EdgeDefinition[];
  orphanCollections: string[];
};

export type EdgeCollectionConfig = CollectionConfigBase & {
  type: "edge";
};

export type CollectionDefinitions =
  | CollectionConfig
  | GraphConfig
  | EdgeCollectionConfig;

export async function sync(...collections: CollectionDefinitions[]) {
  for (const collection of collections) {
    try {
      switch (collection.type) {
        case "collection":
        case "edge":
          await arango.createCollection(
            collection.name,
            collection.type == "edge",
          );
          if (collection.type == "edge") {
            log("Created edge collection:", collection.name);
          } else log("Created collection:", collection.name);
          break;
        case "graph":
          await arango.createGraph(
            collection.name,
            collection.edgeDefinitions,
            ...collection.orphanCollections,
          );
          log("Created graph:", collection.name);
          break;
      }
    } catch (_e) {
      switch (collection.type) {
        case "collection":
        case "edge":
          log("Collection", collection.name, "already exists. Skipping.");
          break;
        case "graph":
          log("Graph", collection.name, "already exists. Skipping.");
          break;
      }
    }
  }
}

export async function createFilesystem(
  user: string,
): Promise<MockFilesystem> {
  const def_fs = defaultFilesystem(user);
  const filesystems = await arango.collection<FSEntry>("filesystems");
  const root = await filesystems.create({
    type: "DIRECTORY",
    path: "/",
    permissions: {
      read: def_fs["/"].permissions.read.bits,
      write: def_fs["/"].permissions.write.bits,
      execute: def_fs["/"].permissions.execute.bits,
    },
    created_at: def_fs["/"].created_at,
    last_modified: def_fs["/"].last_modified,
  });
  const conn = new ArangoFSConnector(arango, root._id);
  for (const path of Object.keys(def_fs).filter((p) => p != "/")) {
    const entry = def_fs[path];
    await conn.place(path, entry);
  }
  return new MockFilesystem(conn);
}

export async function getFilesystem(sys_id: string): Promise<MockFilesystem> {
  try {
    const systems = await arango.collection<System>("systems");
    const sys = await systems.findOne({ _id: sys_id });
    if (sys == undefined) throw new Error("System not found.");
    const conn = new ArangoFSConnector(
      arango,
      sys.filesystem,
    );
    return new MockFilesystem(conn);
  } catch (e) {
    console.error(e);
    throw new Error("Document not found.");
  }
}

log("Synchronizing collections...");

await sync(...config.arangodb.collections);

export default arango;
