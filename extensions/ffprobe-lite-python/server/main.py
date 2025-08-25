from mcp.server import Server
from helpers import parse_allowed, resolve, SandboxError
import os, subprocess, json, shutil
server = Server("ffprobe-lite-python", "0.1.0")
ALLOWED = parse_allowed(os.environ.get("ALLOWED_DIRS"))
@server.tool("health_check")
def health_check() -> dict:
  return {"status": "ok", "version": "0.1.0", "ffprobe": bool(shutil.which("ffprobe"))}
@server.tool("probe_media")
def probe_media(path: str) -> dict:
  try:
    abs_path = resolve(ALLOWED, path)
  except SandboxError as e:
    return {"error": str(e)}
  if not shutil.which("ffprobe"):
    return {"error": "ffprobe not found in PATH"}
  cmd = ["ffprobe","-v","quiet","-print_format","json","-show_format","-show_streams",abs_path]
  try:
    out = subprocess.check_output(cmd, text=True, timeout=10)
    data = json.loads(out)
    return {"path": abs_path, "format": data.get("format", {}), "streams": [s for s in data.get("streams", [])][:4]}
  except subprocess.TimeoutExpired:
    return {"error": "ffprobe timed out"}
  except Exception as e:
    return {"error": str(e)}
server.run_stdio()
