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
  created: number;
  last_modified: number;
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
  readSync(path: string): Uint8Array;
  readSync(path: string, opts?: { encoding?: "utf-8" }): Uint8Array | string;
  readSync(path: string, opts: { encoding: "utf-8" }): string;
  write(path: string, data: string | Uint8Array): Promise<void>;
  write(path: string, data: string): Promise<void>;
  write(path: string, data: Uint8Array): Promise<void>;
  writeSync(path: string, data: string | Uint8Array): void;
  writeSync(path: string, data: string): void;
  writeSync(path: string, data: Uint8Array): void;
  stat(path: string): Promise<MockStat>;
  statSync(path: string): MockStat;
  exists(path: string): Promise<boolean>;
  existsSync(path: string): boolean;
  mkdir(path: string): Promise<void>;
  mkdirSync(path: string): void;
  mkdirp(path: string): Promise<void>;
  mkdirpSync(path: string): void;
  rm(path: string): Promise<void>;
  rmSync(path: string): void;
  rmdir(path: string): Promise<void>;
  rmdirSync(path: string): void;
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
  retrieveSync(path: string): MockEntry;
  placeSync(path: string, entry: MockEntry): void;
  contains(path: string): Promise<boolean>;
  containsSync(path: string): boolean;
}

/**
 * A mock filesystem that acts like a typical node filesystem module.
 *
 * Backed by a connector interface to load filesystem contents on the fly.
 */
export class MockFilesystem {
  constructor(private connector: MockFSConnector) {
    //
  }
}
