import fs from "fs/promises";
import path from "path";

export function parseAllowed(raw: string | undefined): string[] {
  if (!raw) return [];
  try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr.map(String) : []; }
  catch { return raw.split(",").map(s => s.trim()).filter(Boolean); }
}
export function resolveAllowed(allowed: string[], requested: string): string {
  const abs = path.resolve(requested);
  for (const base of allowed) {
    const absBase = path.resolve(base);
    if (abs.startsWith(absBase + path.sep) || abs === absBase) return abs;
  }
  throw new Error("Path not within allowed directories");
}
export async function readCapped(filePath: string, maxBytes: number): Promise<Buffer> {
  const stat = await fs.stat(filePath);
  if (stat.size > maxBytes) throw new Error(`File exceeds limit: ${stat.size} > ${maxBytes}`);
  return fs.readFile(filePath);
}
export function maxBytesFromMb(defaultMb = 8): number {
  const env = process.env.MAX_MB; const mb = env ? Number(env) : defaultMb;
  return Math.max(1, mb) * 1024 * 1024;
}
