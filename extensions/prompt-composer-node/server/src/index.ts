import { Server, StdioServerTransport } from "@modelcontextprotocol/sdk/server";
import { z } from "zod";

type Block = { name: string; text: string; updated_at: number };
const MAX = Number(process.env.MAX_BLOCKS || "50");
const blocks = new Map<string, Block>();

async function main() {
  const server = new Server({ name: "prompt-composer-node", version: "0.1.0" });

  server.tool("health_check", z.object({}), async () => ({ status: "ok", version: "0.1.0", blocks: blocks.size }));

  server.tool("create_block", z.object({ name: z.string().min(1), text: z.string().min(1) }), async ({ name, text }) => {
    if (!blocks.has(name) && blocks.size >= MAX) return { error: "max_blocks reached" };
    blocks.set(name, { name, text, updated_at: Date.now() });
    return { name, length: text.length };
  });

  server.tool("list_blocks", z.object({}), async () => ({ count: blocks.size, items: Array.from(blocks.values()).map(b => ({ name: b.name, updated_at: b.updated_at })) }));

  server.tool("compose_prompt", z.object({ order: z.array(z.string()).min(1) }), async ({ order }) => {
    const missing = order.filter(n => !blocks.has(n));
    if (missing.length) return { error: "missing blocks", missing };
    const text = order.map(n => blocks.get(n)!.text).join("\n\n");
    return { text, characters: text.length };
  });

  const t = new StdioServerTransport();
  await server.connect(t);
}
main().catch(e => { console.error(JSON.stringify({ error: String(e)})); process.exit(1); });
