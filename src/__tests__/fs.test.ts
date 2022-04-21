import arango, { getFilesystem } from "../database/database.ts";
import System from "../database/models/system.ts";
import { createUser, removeUser } from "../user.ts";
import { assertEquals } from "https://deno.land/std@0.130.0/testing/asserts.ts";

Deno.test("fs-test", async () => {
  await removeUser("_test_fs1");
  const systems = await arango.collection<System>("systems");
  const user = await createUser("_test_fs1", "_test_fs1");
  const sys = await systems.findOne({ uuid: user.home_system });
  if (sys == undefined) throw new Error("No system.");
  const fs = await getFilesystem(sys._id);
  const stat = await fs.stat("/home/_test_fs1");
  assertEquals(stat.isDirectory, true);
  assertEquals(await fs.exists("/home/_test_fs1/derp.txt"), false);
  await fs.write("/home/_test_fs1/derp.txt", "derp");
  let res = await fs.read("/home/_test_fs1/derp.txt", { encoding: "utf-8" });
  assertEquals(res, "derp");
  await fs.append("/home/_test_fs1/derp.txt", "derp");
  res = await fs.read("/home/_test_fs1/derp.txt", { encoding: "utf-8" });
  assertEquals(res, "derpderp");
  assertEquals(await removeUser("_test_fs1"), true);
});
