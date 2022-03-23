import { Bitflags } from "./lib/enum.ts";
import {
  ParsedPath,
  posix as _path,
} from "https://deno.land/std@0.127.0/path/mod.ts";

/**
 * Flags for permission values.
 */
export enum MockPermissionFlag {
  User,
  Group,
  All,
}

export const PERM_USER_GROUP = MockPermissionFlag.User |
  MockPermissionFlag.Group;

/**
 * Type alias for `Bitflags<MockPermissionFlag>`.
 */
export type MockPermission = Bitflags<MockPermissionFlag>;
/**
 * Factory method for building a `MockPermission` instance.
 */
export const MockPermissions = Bitflags.factory<MockPermissionFlag>();

/**
 * File and directory access permissions.
 */
export interface MockAccess {
  read: MockPermission;
  write: MockPermission;
  execute: MockPermission;
}

/**
 * Baseline fields for an entry in a mock filesystem.
 */
export interface MockEntryBase {
  type: "DIRECTORY" | "FILE";
  permissions: MockAccess;
  created_at: number;
  last_modified: number;
}

export function defaultMockDir(): MockDirectory {
  return {
    type: "DIRECTORY",
    permissions: {
      read: MockPermissions(PERM_USER_GROUP),
      write: MockPermissions(PERM_USER_GROUP),
      execute: MockPermissions(PERM_USER_GROUP),
    },
    created_at: Date.now(),
    last_modified: Date.now(),
  };
}

/**
 * A directory in the mock filesystem.
 */
export type MockDirectory = MockEntryBase & {
  type: "DIRECTORY";
};

/**
 * A file in the mock filesystem.
 *
 * Contains data, and an encodng field.
 */
export type MockFile = MockEntryBase & {
  type: "FILE";
  contents: Uint8Array;
  encoding: "utf-8" | "binary";
};

/**
 * An entry representing a File or Directory in the
 * mock filesystem.
 */
export type MockEntry = MockFile | MockDirectory;

/**
 * An object indexed by paths containing MockEntry values.
 */
export type MockFS = { [key: string]: MockEntry };

/**
 * A status object representing a file or directory.
 *
 * The path is also parsed and added to the object for
 * additional information.
 */
export type MockStat = {
  isDirectory: boolean;
  isFile: boolean;
} & ParsedPath;

/**
 * Mock Filesystem methods to match the typical node filesystem module.
 */
export interface IMockFS {
  read(path: string): Promise<Uint8Array>;
  read(
    path: string,
    opts?: { encoding?: "utf-8" },
  ): Promise<Uint8Array | string>;
  read(path: string, opts: { encoding: "utf-8" }): Promise<string>;
  write(path: string, data: string | Uint8Array): Promise<void>;
  write(path: string, data: string): Promise<void>;
  write(path: string, data: Uint8Array): Promise<void>;
  append(path: string, data: string | Uint8Array): Promise<void>;
  append(path: string, data: string): Promise<void>;
  append(path: string, data: Uint8Array): Promise<void>;
  stat(path: string): Promise<MockStat>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  mkdirp(path: string): Promise<void>;
  rm(path: string): Promise<void>;
  rmdir(path: string): Promise<void>;
}

/**
 * An interface for reading and writing to a Mock Filesystem backend.
 *
 * Intended to be used with a database driver of some kind to not
 * require loading the entire mocked filesystem into memory.
 */
export interface MockFSConnector {
  retrieve(path: string): Promise<MockEntry>;
  place(path: string, entry: MockEntry): Promise<void>;
  contains(path: string): Promise<boolean>;
}

/**
 * A mock filesystem that acts like a typical node filesystem module.
 *
 * Backed by a connector interface to load filesystem contents on the fly.
 */
export class MockFilesystem implements IMockFS {
  constructor(public readonly connector: MockFSConnector) {}
  public async read(path: string): Promise<Uint8Array>;
  public async read(path: string, opts: { encoding: "utf-8" }): Promise<string>;
  public async read(
    path: string,
    opts?: { encoding?: "utf-8" },
  ): Promise<string | Uint8Array> {
    const entry = await this.connector.retrieve(path);
    if (entry.type == "DIRECTORY") throw new Error("Path is not a file.");
    if (opts?.encoding == "utf-8") {
      return new TextDecoder().decode(entry.contents);
    }
    return entry.contents;
  }
  public async write(path: string, data: Uint8Array): Promise<void>;
  public async write(path: string, data: string): Promise<void>;
  public async write(path: string, data: Uint8Array | string): Promise<void> {
    const encoding = typeof data == "string" ? "utf-8" : "binary";
    if (typeof data == "string") data = new TextEncoder().encode(data);
    if (await this.connector.contains(path)) {
      // Exists
      const entry = await this.connector.retrieve(path);
      if (entry.type == "DIRECTORY") throw new Error("Path is not a file.");
      entry.contents = data;
      return await this.connector.place(path, entry);
    }
    const entry: MockFile = {
      type: "FILE",
      contents: data,
      created_at: Date.now(),
      last_modified: Date.now(),
      permissions: {
        read: MockPermissions(PERM_USER_GROUP),
        write: MockPermissions(PERM_USER_GROUP),
        execute: MockPermissions(PERM_USER_GROUP),
      },
      encoding,
    };
    return await this.connector.place(path, entry);
  }
  public async append(path: string, data: Uint8Array): Promise<void>;
  public async append(path: string, data: string): Promise<void>;
  public async append(path: string, data: Uint8Array | string): Promise<void> {
    if (typeof data == "string") data = new TextEncoder().encode(data);
    if (await this.connector.contains(path)) {
      // Exists
      const entry = await this.connector.retrieve(path);
      if (entry.type == "DIRECTORY") throw new Error("Path is not a file.");
      const ndata = new Uint8Array([...entry.contents, ...data]);
      entry.contents = ndata;
      return await this.connector.place(path, entry);
    }
    return await this.write(path, data);
  }
  public async exists(path: string): Promise<boolean> {
    return await this.connector.contains(path);
  }
  public async stat(path: string): Promise<MockStat> {
    if (!await this.exists(path)) throw new Error("Path does not exist.");
    const entry = await this.connector.retrieve(path);
    return Object.assign({
      isDirectory: entry.type == "DIRECTORY",
      isFile: entry.type == "FILE",
    }, _path.parse(path));
  }
  public async mkdir(path: string): Promise<void> {
    if (await this.exists(path)) throw new Error("Path already exists.");
    const entry: MockDirectory = {
      type: "DIRECTORY",
      created_at: Date.now(),
      last_modified: Date.now(),
      permissions: {
        read: MockPermissions(PERM_USER_GROUP),
        write: MockPermissions(PERM_USER_GROUP),
        execute: MockPermissions(PERM_USER_GROUP),
      },
    };
    return await this.connector.place(path, entry);
  }
  // deno-lint-ignore require-await no-unused-vars
  public async mkdirp(path: string): Promise<void> {
    throw new Error("Not yet implemented.");
  }
  // deno-lint-ignore require-await no-unused-vars
  public async rm(path: string): Promise<void> {
    throw new Error("Not yet implemented.");
  }
  // deno-lint-ignore require-await no-unused-vars
  public async rmdir(path: string): Promise<void> {
    throw new Error("Not yet implemented.");
  }
}

export function defaultFilesystem(user: string): MockFS {
  const res: MockFS = {
    "/": defaultMockDir(),
    "/home": defaultMockDir(),
    "/bin": defaultMockDir(),
  };
  res[`/home/${user}`] = defaultMockDir();
  return res;
}
