from pathlib import Path
import os, json
class SandboxError(Exception): pass
def parse_allowed(raw: str | None) -> list[str]:
  if not raw: return []
  try:
    arr = json.loads(raw); return arr if isinstance(arr, list) else []
  except Exception:
    return [s.strip() for s in raw.split(",") if s.strip()]
def resolve(allowed: list[str], requested: str) -> str:
  p = Path(requested).expanduser().resolve()
  for base in allowed:
    b = Path(base).expanduser().resolve()
    if str(p) == str(b) or str(p).startswith(str(b) + os.sep): return str(p)
  raise SandboxError("Path not within allowed directories")
