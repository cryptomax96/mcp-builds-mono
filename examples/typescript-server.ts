/**
 * Minimal MCP Server Implementation - TypeScript
 * This is a complete, working example of an MCP server for Claude Desktop Extensions
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// Configuration from environment
const config = {
  allowedDirectories: process.env.ALLOWED_DIRS?.split(',') || ['~/Desktop'],
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB
  rateLimit: parseInt(process.env.RATE_LIMIT || '60'), // per minute
};

// Server state
const state = {
  startTime: Date.now(),
  requestCount: 0,
  rateLimitWindow: new Map<string, number[]>(),
};

// Input validation schemas
const ReadFileSchema = z.object({
  path: z.string().max(4096),
  encoding: z.enum(['utf8', 'base64']).optional().default('utf8'),
});

const WriteFileSchema = z.object({
  path: z.string().max(4096),
  content: z.string().max(10 * 1024 * 1024), // 10MB max
  encoding: z.enum(['utf8', 'base64']).optional().default('utf8'),
});

// Security helpers
function expandPath(filepath: string): string {
  if (filepath.startsWith('~/')) {
    return path.join(process.env.HOME || '', filepath.slice(2));
  }
  return path.resolve(filepath);
}

function validatePath(requestedPath: string): string {
  const resolved = expandPath(requestedPath);
  
  // Check against allowed directories
  const isAllowed = config.allowedDirectories.some(dir => {
    const allowedPath = expandPath(dir);
    return resolved.startsWith(allowedPath);
  });
  
  if (!isAllowed) {
    throw new Error(`Path outside sandbox: ${requestedPath}`);
  }
  
  return resolved;
}

function checkRateLimit(clientId: string = 'default'): void {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  // Get or create rate limit window for client
  let requests = state.rateLimitWindow.get(clientId) || [];
  
  // Remove old requests outside window
  requests = requests.filter(timestamp => timestamp > windowStart);
  
  if (requests.length >= config.rateLimit) {
    throw new Error('Rate limit exceeded. Try again later.');
  }
  
  // Add current request
  requests.push(now);
  state.rateLimitWindow.set(clientId, requests);
}

// Audit logging
function auditLog(tool: string, outcome: 'success' | 'error', details?: any): void {
  const log = {
    timestamp: new Date().toISOString(),
    tool,
    outcome,
    duration_ms: Date.now() - state.startTime,
    request_number: ++state.requestCount,
    // Never log sensitive data!
    details: details ? { 
      error_code: details.code,
      path_hash: details.path ? crypto.createHash('sha256').update(details.path).digest('hex').slice(0, 8) : undefined
    } : undefined,
  };
  
  console.error(JSON.stringify(log)); // Use stderr for logs
}

// Initialize MCP server
const server = new Server(
  {
    name: 'example-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

// Tool: health_check (REQUIRED)
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    checkRateLimit();
    
    switch (name) {
      case 'health_check': {
        const result = {
          status: 'ok' as const,
          version: '1.0.0',
          uptime_seconds: Math.floor((Date.now() - state.startTime) / 1000),
          memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          active_operations: 0,
          request_count: state.requestCount,
        };
        
        auditLog('health_check', 'success');
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      
      case 'capabilities': {
        const result = {
          tools: [
            { name: 'health_check', description: 'Check server health' },
            { name: 'capabilities', description: 'List server capabilities' },
            { name: 'read_file_sandboxed', description: 'Read file within allowed directories' },
            { name: 'write_file_sandboxed', description: 'Write file within allowed directories' },
            { name: 'list_directory', description: 'List directory contents' },
          ],
          prompts: [
            {
              name: 'analyze_file',
              description: 'Analyze a file and provide insights',
              arguments: [
                { name: 'filepath', description: 'Path to file', required: true },
              ],
            },
          ],
          limits: {
            max_file_size: config.maxFileSize,
            rate_limit_per_minute: config.rateLimit,
            allowed_directories: config.allowedDirectories,
          },
        };
        
        auditLog('capabilities', 'success');
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      
      case 'read_file_sandboxed': {
        const params = ReadFileSchema.parse(args);
        const safePath = validatePath(params.path);
        
        // Check file size before reading
        const stats = await fs.stat(safePath);
        if (stats.size > config.maxFileSize) {
          throw new Error(`File too large: ${stats.size} bytes (max: ${config.maxFileSize})`);
        }
        
        const content = await fs.readFile(safePath, params.encoding as BufferEncoding);
        
        auditLog('read_file_sandboxed', 'success', { path: params.path });
        return { content: [{ type: 'text', text: content }] };
      }
      
      case 'write_file_sandboxed': {
        const params = WriteFileSchema.parse(args);
        const safePath = validatePath(params.path);
        
        // Create directory if it doesn't exist
        await fs.mkdir(path.dirname(safePath), { recursive: true });
        
        // Write file
        await fs.writeFile(safePath, params.content, params.encoding as BufferEncoding);
        
        auditLog('write_file_sandboxed', 'success', { path: params.path });
        return { content: [{ type: 'text', text: `File written successfully: ${params.path}` }] };
      }
      
      case 'list_directory': {
        const params = z.object({ path: z.string() }).parse(args);
        const safePath = validatePath(params.path);
        
        const items = await fs.readdir(safePath, { withFileTypes: true });
        const result = items.map(item => ({
          name: item.name,
          type: item.isDirectory() ? 'directory' : 'file',
        }));
        
        auditLog('list_directory', 'success', { path: params.path });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    auditLog(name, 'error', { code: error.code || 'UNKNOWN' });
    
    // Return user-friendly error messages
    const errorMessage = error.message || 'An unexpected error occurred';
    return {
      content: [{ 
        type: 'text', 
        text: `Error: ${errorMessage}` 
      }],
      isError: true,
    };
  }
});

// Handle prompts
server.setRequestHandler('prompts/get', async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'analyze_file') {
    const filepath = args?.filepath as string;
    if (!filepath) {
      throw new Error('filepath argument is required');
    }
    
    return {
      description: `Analyze the file at ${filepath}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please analyze the file at ${filepath} and provide:
1. File type and format
2. Size and metadata
3. Key insights or patterns
4. Potential issues or concerns
5. Recommendations for processing or usage`,
          },
        },
      ],
    };
  }
  
  throw new Error(`Unknown prompt: ${name}`);
});

// Handle listing of tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'health_check',
        description: 'Check server health and status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'capabilities',
        description: 'List server capabilities and limits',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'read_file_sandboxed',
        description: 'Read a file within allowed directories',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to read' },
            encoding: { 
              type: 'string', 
              enum: ['utf8', 'base64'],
              default: 'utf8',
              description: 'File encoding' 
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_file_sandboxed',
        description: 'Write a file within allowed directories',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to write' },
            content: { type: 'string', description: 'Content to write' },
            encoding: { 
              type: 'string', 
              enum: ['utf8', 'base64'],
              default: 'utf8',
              description: 'Content encoding' 
            },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'list_directory',
        description: 'List contents of a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path' },
          },
          required: ['path'],
        },
      },
    ],
  };
});

// Handle listing of prompts
server.setRequestHandler('prompts/list', async () => {
  return {
    prompts: [
      {
        name: 'analyze_file',
        description: 'Analyze a file and provide insights',
        arguments: [
          {
            name: 'filepath',
            description: 'Path to the file to analyze',
            required: true,
          },
        ],
      },
    ],
  };
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.error('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Shutting down gracefully...');
  process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  auditLog('system', 'error', { code: 'UNCAUGHT_EXCEPTION' });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  auditLog('system', 'error', { code: 'UNHANDLED_REJECTION' });
  process.exit(1);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server started successfully');
  console.error(`Allowed directories: ${config.allowedDirectories.join(', ')}`);
  console.error(`Rate limit: ${config.rateLimit} requests/minute`);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
