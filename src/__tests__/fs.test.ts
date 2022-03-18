import arango, { createFilesystem } from "../database/database.ts";
import { MockFS } from "../filesystem.ts";
import { assertEquals } from "https://deno.land/std@0.130.0/testing/asserts.ts";

Deno.test("fs-test", async () => {
  const col = await arango.collection<MockFS>("filesystems");
  await col.truncate();
  const fs = await createFilesystem("test1");
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
