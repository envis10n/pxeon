import config from "../config.ts";
import {
  Arango,
  Collection,
  Document,
} from "https://deno.land/x/darango@0.1.0/mod.ts";
export * from "https://deno.land/x/darango@0.1.0/mod.ts";
import {
  MockEntry,
  MockFilesystem,
  MockFS,
  MockFSConnector,
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
    if (doc[path] != undefined) return doc[path];
    else throw new Error("Path does not exist.");
  }
  public async place(path: string, entry: MockEntry): Promise<void> {
    const doc = await this.doc();
    doc[path] = entry;
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

export async function createFilesystem(): Promise<MockFilesystem> {
  throw new Error("Not yet implemented.");
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
