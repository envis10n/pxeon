import worker from "../net/worker.ts";

Deno.test("worker", async () => {
  const listener = worker(
    new URL("../net/workers/telnet.ts", import.meta.url),
    { hostname: "localhost", port: 3550 },
  );
  await listener.init(console.log);
});
