from mcp.server import Server
from helpers import parse_allowed, resolve, read_capped, SandboxError
import os, time

server = Server("fs-sandbox-python", "0.1.0")
ALLOWED = parse_allowed(os.environ.get("ALLOWED_DIRS"))
MAX_MB = int(os.environ.get("MAX_MB", "8"))

@server.tool("health_check")
def health_check() -> dict:
  return {"status": "ok", "version": "0.1.0", "uptime_s": time.process_time()}

@server.tool("read_file")
def read_file(path: str) -> dict:
  try:
    abs_path = resolve(ALLOWED, path)
    data = read_capped(abs_path, MAX_MB)
    return {"path": abs_path, "size": len(data), "content": data.decode("utf-8", errors="replace")}
  except SandboxError as e:
    return {"error": str(e)}

server.run_stdio()
