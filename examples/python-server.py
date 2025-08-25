#!/usr/bin/env python3
"""
Minimal MCP Server Implementation - Python
This is a complete, working example of an MCP server for Claude Desktop Extensions
"""

import asyncio
import json
import os
import sys
import time
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional, Literal
from datetime import datetime
from collections import defaultdict

from pydantic import BaseModel, Field, field_validator
from mcp.server import Server, StdioServerTransport
from mcp.server.models import InitializationOptions
import mcp.types as types

# Configuration from environment
CONFIG = {
    "allowed_directories": os.getenv("ALLOWED_DIRS", "~/Desktop").split(","),
    "max_file_size": int(os.getenv("MAX_FILE_SIZE", "104857600")),  # 100MB
    "rate_limit": int(os.getenv("RATE_LIMIT", "60")),  # per minute
}

# Server state
class ServerState:
    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0
        self.rate_limit_window: Dict[str, List[float]] = defaultdict(list)

state = ServerState()

# Input validation models
class ReadFileParams(BaseModel):
    path: str = Field(..., max_length=4096)
    encoding: Literal["utf8", "base64"] = "utf8"

class WriteFileParams(BaseModel):
    path: str = Field(..., max_length=4096)
    content: str = Field(..., max_length=10 * 1024 * 1024)  # 10MB max
    encoding: Literal["utf8", "base64"] = "utf8"

class ListDirectoryParams(BaseModel):
    path: str = Field(..., max_length=4096)

# Security helpers
def expand_path(filepath: str) -> Path:
    """Expand user paths and resolve to absolute path."""
    if filepath.startswith("~/"):
        return Path.home() / filepath[2:]
    return Path(filepath).resolve()

def validate_path(requested_path: str) -> Path:
    """Validate that path is within allowed directories."""
    resolved = expand_path(requested_path)
    
    # Check against allowed directories
    allowed_paths = [expand_path(d) for d in CONFIG["allowed_directories"]]
    
    for allowed_path in allowed_paths:
        try:
            # Check if resolved path is within allowed path
            resolved.relative_to(allowed_path)
            return resolved
        except ValueError:
            continue
    
    raise PermissionError(f"Path outside sandbox: {requested_path}")

def check_rate_limit(client_id: str = "default") -> None:
    """Check if client has exceeded rate limit."""
    now = time.time()
    window_start = now - 60  # 1 minute window
    
    # Get requests in current window
    requests = state.rate_limit_window[client_id]
    requests = [t for t in requests if t > window_start]
    
    if len(requests) >= CONFIG["rate_limit"]:
        raise Exception("Rate limit exceeded. Try again later.")
    
    # Add current request
    requests.append(now)
    state.rate_limit_window[client_id] = requests

def audit_log(tool: str, outcome: Literal["success", "error"], details: Optional[Dict] = None) -> None:
    """Log audit events to stderr."""
    state.request_count += 1
    
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "tool": tool,
        "outcome": outcome,
        "duration_ms": int((time.time() - state.start_time) * 1000),
        "request_number": state.request_count,
    }
    
    # Never log sensitive data!
    if details:
        safe_details = {}
        if "error_code" in details:
            safe_details["error_code"] = details["error_code"]
        if "path" in details:
            # Hash the path for privacy
            path_hash = hashlib.sha256(details["path"].encode()).hexdigest()[:8]
            safe_details["path_hash"] = path_hash
        log_entry["details"] = safe_details
    
    print(json.dumps(log_entry), file=sys.stderr)

# Initialize MCP server
server = Server("example-mcp-server")

@server.list_tools()
async def handle_list_tools() -> List[types.Tool]:
    """List all available tools."""
    return [
        types.Tool(
            name="health_check",
            description="Check server health and status",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        types.Tool(
            name="capabilities",
            description="List server capabilities and limits",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        types.Tool(
            name="read_file_sandboxed",
            description="Read a file within allowed directories",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "File path to read",
                    },
                    "encoding": {
                        "type": "string",
                        "enum": ["utf8", "base64"],
                        "default": "utf8",
                        "description": "File encoding",
                    },
                },
                "required": ["path"],
            },
        ),
        types.Tool(
            name="write_file_sandboxed",
            description="Write a file within allowed directories",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "File path to write",
                    },
                    "content": {
                        "type": "string",
                        "description": "Content to write",
                    },
                    "encoding": {
                        "type": "string",
                        "enum": ["utf8", "base64"],
                        "default": "utf8",
                        "description": "Content encoding",
                    },
                },
                "required": ["path", "content"],
            },
        ),
        types.Tool(
            name="list_directory",
            description="List contents of a directory",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Directory path",
                    },
                },
                "required": ["path"],
            },
        ),
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: Any) -> List[types.TextContent]:
    """Handle tool execution."""
    try:
        check_rate_limit()
        
        if name == "health_check":
            result = {
                "status": "ok",
                "version": "1.0.0",
                "uptime_seconds": int(time.time() - state.start_time),
                "memory_mb": 0,  # Python doesn't have easy heap size access
                "active_operations": 0,
                "request_count": state.request_count,
            }
            
            audit_log("health_check", "success")
            return [types.TextContent(type="text", text=json.dumps(result, indent=2))]
        
        elif name == "capabilities":
            result = {
                "tools": [
                    {"name": "health_check", "description": "Check server health"},
                    {"name": "capabilities", "description": "List server capabilities"},
                    {"name": "read_file_sandboxed", "description": "Read file within allowed directories"},
                    {"name": "write_file_sandboxed", "description": "Write file within allowed directories"},
                    {"name": "list_directory", "description": "List directory contents"},
                ],
                "prompts": [
                    {
                        "name": "analyze_file",
                        "description": "Analyze a file and provide insights",
                        "arguments": [
                            {"name": "filepath", "description": "Path to file", "required": True},
                        ],
                    },
                ],
                "limits": {
                    "max_file_size": CONFIG["max_file_size"],
                    "rate_limit_per_minute": CONFIG["rate_limit"],
                    "allowed_directories": CONFIG["allowed_directories"],
                },
            }
            
            audit_log("capabilities", "success")
            return [types.TextContent(type="text", text=json.dumps(result, indent=2))]
        
        elif name == "read_file_sandboxed":
            params = ReadFileParams(**arguments)
            safe_path = validate_path(params.path)
            
            # Check file size before reading
            file_size = safe_path.stat().st_size
            if file_size > CONFIG["max_file_size"]:
                raise ValueError(f"File too large: {file_size} bytes (max: {CONFIG['max_file_size']})")
            
            if params.encoding == "utf8":
                content = safe_path.read_text(encoding="utf-8")
            else:
                import base64
                content = base64.b64encode(safe_path.read_bytes()).decode("ascii")
            
            audit_log("read_file_sandboxed", "success", {"path": params.path})
            return [types.TextContent(type="text", text=content)]
        
        elif name == "write_file_sandboxed":
            params = WriteFileParams(**arguments)
            safe_path = validate_path(params.path)
            
            # Create directory if it doesn't exist
            safe_path.parent.mkdir(parents=True, exist_ok=True)
            
            if params.encoding == "utf8":
                safe_path.write_text(params.content, encoding="utf-8")
            else:
                import base64
                safe_path.write_bytes(base64.b64decode(params.content))
            
            audit_log("write_file_sandboxed", "success", {"path": params.path})
            return [types.TextContent(type="text", text=f"File written successfully: {params.path}")]
        
        elif name == "list_directory":
            params = ListDirectoryParams(**arguments)
            safe_path = validate_path(params.path)
            
            if not safe_path.is_dir():
                raise ValueError(f"Not a directory: {params.path}")
            
            items = []
            for item in safe_path.iterdir():
                items.append({
                    "name": item.name,
                    "type": "directory" if item.is_dir() else "file",
                })
            
            audit_log("list_directory", "success", {"path": params.path})
            return [types.TextContent(type="text", text=json.dumps(items, indent=2))]
        
        else:
            raise ValueError(f"Unknown tool: {name}")
    
    except Exception as e:
        audit_log(name, "error", {"error_code": type(e).__name__})
        
        # Return user-friendly error message
        error_message = str(e) or "An unexpected error occurred"
        return [types.TextContent(type="text", text=f"Error: {error_message}")]

@server.list_prompts()
async def handle_list_prompts() -> List[types.Prompt]:
    """List all available prompts."""
    return [
        types.Prompt(
            name="analyze_file",
            description="Analyze a file and provide insights",
            arguments=[
                types.PromptArgument(
                    name="filepath",
                    description="Path to the file to analyze",
                    required=True,
                ),
            ],
        ),
    ]

@server.get_prompt()
async def handle_get_prompt(name: str, arguments: Optional[Dict[str, str]] = None) -> types.GetPromptResult:
    """Get a specific prompt."""
    if name == "analyze_file":
        filepath = arguments.get("filepath") if arguments else None
        if not filepath:
            raise ValueError("filepath argument is required")
        
        return types.GetPromptResult(
            description=f"Analyze the file at {filepath}",
            messages=[
                types.PromptMessage(
                    role="user",
                    content=types.TextContent(
                        type="text",
                        text=f"""Please analyze the file at {filepath} and provide:
1. File type and format
2. Size and metadata
3. Key insights or patterns
4. Potential issues or concerns
5. Recommendations for processing or usage""",
                    ),
                ),
            ],
        )
    
    raise ValueError(f"Unknown prompt: {name}")

async def main():
    """Main entry point."""
    # Log startup information
    print(f"MCP Server starting...", file=sys.stderr)
    print(f"Allowed directories: {', '.join(CONFIG['allowed_directories'])}", file=sys.stderr)
    print(f"Rate limit: {CONFIG['rate_limit']} requests/minute", file=sys.stderr)
    
    # Create and run transport
    async with StdioServerTransport() as transport:
        await server.run(
            transport,
            InitializationOptions(
                server_name="example-mcp-server",
                server_version="1.0.0",
            ),
        )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server shutting down gracefully...", file=sys.stderr)
        sys.exit(0)
    except Exception as e:
        print(f"Server failed: {e}", file=sys.stderr)
        audit_log("system", "error", {"error_code": "STARTUP_FAILURE"})
        sys.exit(1)
