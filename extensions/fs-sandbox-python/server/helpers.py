from pathlib import Path
import os, json

class SandboxError(Exception): pass

def parse_allowed(raw: str | None) -> list[str]:
  if not raw: return []
  try:
    arr = json.loads(raw)
    if isinstance(arr, list): return [str(x) for x in arr]
  except Exception: pass
  return [s.strip() for s in raw.split(",") if s.strip()]

def resolve(allowed: list[str], requested: str) -> str:
  abs_path = str(Path(requested).expanduser().resolve())
  for base in allowed:
    base_abs = str(Path(base).expanduser().resolve())
    if abs_path == base_abs or abs_path.startswith(base_abs + os.sep):
      return abs_path
  raise SandboxError("Path not within allowed directories")

def read_capped(p: str, max_mb: int = 8) -> bytes:
  size = Path(p).stat().st_size
  cap = max(1, max_mb) * 1024 * 1024
  if size > cap:
    raise SandboxError(f"File exceeds limit: {size} > {cap}")
  return Path(p).read_bytes()
