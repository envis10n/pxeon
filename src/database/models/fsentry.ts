/**
 * TODO: Add model to represent a file or directory.
 * This can be linked to filesystem roots, and could even leverage Arango's graph engine.
 */

export type FSEntryBase = {
  type: "DIRECTORY" | "FILE";
  path: string;
  last_modified: number;
  permissions: {
    read: number;
    write: number;
    execute: number;
  };
  created_at: number;
};

export type FSEntryDir = FSEntryBase & {
  type: "DIRECTORY";
};

export type FSEntryFile = FSEntryBase & {
  type: "FILE";
  contents: number[];
  encoding: "utf-8" | "binary";
};

export type FSEntry = FSEntryDir | FSEntryFile;

export default FSEntry;
