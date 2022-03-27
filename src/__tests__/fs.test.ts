import arango, { createFilesystem } from "../database/database.ts";
import { assertEquals } from "https://deno.land/std@0.130.0/testing/asserts.ts";

Deno.test("fs-test", async () => {
  const systems = await arango.collection("systems");
  const filesystems = await arango.collection("filesystems");
  const edges = await arango.collection("file_links");
  await filesystems.truncate();
  await edges.truncate();
  await systems.truncate();
  const fs = await createFilesystem("test1");
  await systems.create({
    uuid: crypto.randomUUID(),
    filesystems: fs.connector.root_id,
  });
  const stat = await fs.stat("/home/test1");
  assertEquals(stat.isDirectory, true);
  assertEquals(await fs.exists("/home/test1/derp.txt"), false);
  await fs.write("/home/test1/derp.txt", "derp");
  let res = await fs.read("/home/test1/derp.txt", { encoding: "utf-8" });
  assertEquals(res, "derp");
  await fs.append("/home/test1/derp.txt", "derp");
  res = await fs.read("/home/test1/derp.txt", { encoding: "utf-8" });
  assertEquals(res, "derpderp");
});
