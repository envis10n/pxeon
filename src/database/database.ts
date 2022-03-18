import config from "../config.ts";
import {
  Arango,
  Collection,
  Document,
} from "https://deno.land/x/darango@0.1.0/mod.ts";
export * from "https://deno.land/x/darango@0.1.0/mod.ts";
import {
  defaultFilesystem,
  MockEntry,
  MockFilesystem,
  MockFS,
  MockFSConnector,
  MockPermissions,
} from "../filesystem.ts";

export class ArangoFSConnector implements MockFSConnector {
  constructor(
    private readonly collection: Collection<MockFS>,
    public readonly doc_id: string,
  ) {}
  private async doc(): Promise<Document<MockFS>> {
    return await this.collection.get(this.doc_id);
  }
  public async retrieve(path: string): Promise<MockEntry> {
    const doc = await this.doc();
    if (doc[path] != undefined) {
      const entry = doc[path];
      if (entry.type == "FILE") {
        const temp = entry.contents as { [key: number]: number }; // Stored in DB as object
        entry.contents = new Uint8Array([...Object.values(temp)]);
      }
      // Handle permissions rebuilding.
      const _execute = entry.permissions.execute as unknown as {
        _value: number;
      };
      const _read = entry.permissions.read as unknown as { _value: number };
      const _write = entry.permissions.write as unknown as { _value: number };
      entry.permissions.execute = MockPermissions(_execute._value);
      entry.permissions.read = MockPermissions(_read._value);
      entry.permissions.write = MockPermissions(_write._value);
      // End permissions rebuild.

      return entry;
    } else throw new Error("Path does not exist.");
  }
  public async place(path: string, entry: MockEntry): Promise<void> {
    const doc = await this.doc();
    doc[path] = entry;
    await doc.update();
  }
  public async contains(path: string): Promise<boolean> {
    const doc = await this.doc();
    return doc[path] != undefined;
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

export async function createFilesystem(user: string): Promise<MockFilesystem> {
  const fscol = await arango.collection<MockFS>("filesystems");
  const doc = await fscol.create(defaultFilesystem(user));
  const conn = new ArangoFSConnector(fscol, doc._key);
  return new MockFilesystem(conn);
}

export async function getFilesystem(key: string): Promise<MockFilesystem> {
  try {
    (await arango.collection<MockFS>("filesystems")).get(key);
    const conn = new ArangoFSConnector(
      await arango.collection<MockFS>("filesystems"),
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
