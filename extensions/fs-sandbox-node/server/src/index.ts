import { StdioServerTransport, Server } from "@modelcontextprotocol/sdk/server";
import { z } from "zod";
import { parseAllowed, resolveAllowed, readCapped, maxBytesFromMb } from "./helpers.js";
import { glob } from "glob";

async function main() {
  const allowed = parseAllowed(process.env.ALLOWED_DIRS);
  const MAXB = maxBytesFromMb();
  const server = new Server({ name: "fs-sandbox-node", version: "0.1.0" });

  server.tool("health_check", z.object({}), async () => ({
    status: "ok", version: "0.1.0", uptime_s: process.uptime()
  }));

  server.tool("read_file", z.object({ path: z.string() }), async ({ path }) => {
    const abs = resolveAllowed(allowed, path);
    const buf = await readCapped(abs, MAXB);
    return { path: abs, size: buf.length, content: buf.toString("utf8") };
  });

  server.tool("search_glob", z.object({ pattern: z.string(), cwd: z.string().optional() }), async ({ pattern, cwd }) => {
    const base = cwd ? resolveAllowed(allowed, cwd) : (allowed[0] || process.cwd());
    const matches = await glob(pattern, { cwd: base, absolute: true, nodir: true });
    return { base, count: matches.length, results: matches.slice(0, 200) };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
main().catch(err => { console.error(JSON.stringify({ error: String(err) })); process.exit(1); });
