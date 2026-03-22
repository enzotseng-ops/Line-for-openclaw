/**
 * MCP (Model Context Protocol) service.
 * Manages connections to MCP servers, discovers tools, and executes tool calls.
 */
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const db = require('../config/db');
const { decrypt } = require('../config/encryption');
const logger = require('../config/logger');

// In-memory client pool: serverId → { client, transport, connectedAt }
const clientPool = new Map();

/**
 * Build request headers for an MCP server (Bearer token + custom headers).
 */
function buildHeaders(server) {
  const headers = {};
  if (server.api_key) {
    const key = decrypt(server.api_key);
    if (key) headers.Authorization = `Bearer ${key}`;
  }
  if (server.custom_headers) {
    try {
      const custom = JSON.parse(decrypt(server.custom_headers));
      Object.assign(headers, custom);
    } catch {
      // ignore malformed custom_headers
    }
  }
  return headers;
}

/**
 * Create transport based on server config.
 */
function createTransport(server) {
  const headers = buildHeaders(server);
  const url = new URL(server.url);

  if (server.transport_type === 'streamable-http') {
    return new StreamableHTTPClientTransport(url, { requestInit: { headers } });
  }
  // Default: SSE
  return new SSEClientTransport(url, { requestInit: { headers } });
}

/**
 * Connect to an MCP server and return the client.
 * Uses a cached connection if available.
 */
async function getClient(server) {
  const existing = clientPool.get(server.id);
  if (existing) return existing.client;

  const transport = createTransport(server);
  const client = new Client(
    { name: 'line-ai-bot', version: '1.0.0' },
    { capabilities: {} },
  );

  await client.connect(transport);

  clientPool.set(server.id, {
    client,
    transport,
    connectedAt: Date.now(),
  });

  return client;
}

/**
 * Disconnect a cached MCP client.
 */
async function disconnectClient(serverId) {
  const entry = clientPool.get(serverId);
  if (!entry) return;
  try {
    await entry.client.close();
  } catch {
    // ignore close errors
  }
  clientPool.delete(serverId);
}

/**
 * Discover tools from a single MCP server. Updates tools_cache in DB.
 */
async function discoverTools(server) {
  const client = await getClient(server);
  const result = await client.listTools();
  const tools = result.tools || [];

  // Cache tools in DB
  await db('mcp_servers').where({ id: server.id }).update({
    tools_cache: JSON.stringify(tools),
    last_connected_at: new Date(),
    updated_at: new Date(),
  });

  return tools;
}

/**
 * Get all tools from all enabled MCP servers.
 * Returns tools in a format suitable for LLM tool calling.
 */
async function getAllTools() {
  const servers = await db('mcp_servers').where({ is_enabled: true });
  const allTools = [];

  for (const server of servers) {
    try {
      // Use cached tools if available and recent (within 5 minutes)
      let tools;
      const cacheAge = server.last_connected_at
        ? Date.now() - new Date(server.last_connected_at).getTime()
        : Infinity;

      if (server.tools_cache && cacheAge < 5 * 60 * 1000) {
        tools = JSON.parse(server.tools_cache);
      } else {
        tools = await discoverTools(server);
      }

      for (const tool of tools) {
        allTools.push({
          serverId: server.id,
          serverName: server.name,
          name: tool.name,
          description: tool.description || '',
          inputSchema: tool.inputSchema || { type: 'object', properties: {} },
        });
      }
    } catch (err) {
      logger.warn(`MCP server "${server.name}" (id=${server.id}) tool discovery failed: ${err.message}`);
    }
  }

  return allTools;
}

/**
 * Call a tool on the appropriate MCP server.
 */
async function callTool(toolName, args) {
  // Find which server has this tool
  const servers = await db('mcp_servers').where({ is_enabled: true });

  for (const server of servers) {
    let tools = [];
    if (server.tools_cache) {
      try {
        tools = JSON.parse(server.tools_cache);
      } catch {
        continue;
      }
    }

    const hasTool = tools.some((t) => t.name === toolName);
    if (!hasTool) continue;

    const client = await getClient(server);
    const result = await client.callTool({ name: toolName, arguments: args });
    return result;
  }

  throw new Error(`Tool "${toolName}" not found on any enabled MCP server`);
}

/**
 * Test connection to a specific MCP server.
 */
async function testConnection(serverId) {
  const server = await db('mcp_servers').where({ id: serverId }).first();
  if (!server) throw new Error('MCP server not found');

  // Force reconnect
  await disconnectClient(serverId);

  const tools = await discoverTools(server);

  return {
    success: true,
    serverName: server.name,
    toolCount: tools.length,
    tools: tools.map((t) => ({ name: t.name, description: t.description })),
  };
}

/**
 * Disconnect all cached clients (for cleanup on shutdown).
 */
async function disconnectAll() {
  for (const [serverId] of clientPool) {
    await disconnectClient(serverId);
  }
}

module.exports = {
  getAllTools,
  callTool,
  testConnection,
  discoverTools,
  disconnectClient,
  disconnectAll,
};
