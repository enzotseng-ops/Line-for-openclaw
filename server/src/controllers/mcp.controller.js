const db = require('../config/db');
const { encrypt } = require('../config/encryption');
const { testConnection, disconnectClient, discoverTools } = require('../services/mcp.service');
const logger = require('../config/logger');

const ENCRYPTED_FIELDS = ['api_key', 'custom_headers'];

async function list(req, res, next) {
  try {
    const servers = await db('mcp_servers')
      .select('id', 'name', 'transport_type', 'url', 'api_key', 'custom_headers', 'is_enabled', 'tools_cache', 'last_connected_at', 'created_at', 'updated_at')
      .orderBy('created_at', 'asc');

    const masked = servers.map((s) => {
      const toolCount = s.tools_cache ? JSON.parse(s.tools_cache).length : 0;
      return {
        ...s,
        api_key: s.api_key ? '***encrypted***' : '',
        custom_headers: s.custom_headers ? '***encrypted***' : '',
        tools_cache: undefined,
        tool_count: toolCount,
        tools: s.tools_cache ? JSON.parse(s.tools_cache).map((t) => ({ name: t.name, description: t.description })) : [],
      };
    });

    res.json(masked);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, transport_type, url, api_key, custom_headers } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: '名稱和 URL 為必填' });
    }

    const record = {
      name,
      transport_type: transport_type || 'sse',
      url,
      api_key: api_key ? encrypt(api_key) : null,
      custom_headers: custom_headers ? encrypt(JSON.stringify(custom_headers)) : null,
      is_enabled: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [inserted] = await db('mcp_servers').insert(record).returning('*');
    res.status(201).json({
      ...inserted,
      api_key: inserted.api_key ? '***encrypted***' : '',
      custom_headers: inserted.custom_headers ? '***encrypted***' : '',
    });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { name, transport_type, url, api_key, custom_headers, is_enabled } = req.body;

    const existing = await db('mcp_servers').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'MCP server not found' });
    }

    const updates = { updated_at: new Date() };

    if (name !== undefined) updates.name = name;
    if (transport_type !== undefined) updates.transport_type = transport_type;
    if (url !== undefined) updates.url = url;
    if (is_enabled !== undefined) updates.is_enabled = is_enabled;

    // Only update encrypted fields if not the masked placeholder
    if (api_key !== undefined && api_key !== '***encrypted***') {
      updates.api_key = api_key ? encrypt(api_key) : null;
    }
    if (custom_headers !== undefined && custom_headers !== '***encrypted***') {
      updates.custom_headers = custom_headers ? encrypt(JSON.stringify(custom_headers)) : null;
    }

    await db('mcp_servers').where({ id }).update(updates);

    // Disconnect cached client so next connection uses new config
    await disconnectClient(parseInt(id, 10));

    res.json({ id: parseInt(id, 10), updated: true });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await db('mcp_servers').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'MCP server not found' });
    }

    await disconnectClient(parseInt(id, 10));
    await db('mcp_servers').where({ id }).del();

    res.json({ id: parseInt(id, 10), deleted: true });
  } catch (err) {
    next(err);
  }
}

async function test(req, res, next) {
  try {
    const { id } = req.params;
    const result = await testConnection(parseInt(id, 10));
    res.json(result);
  } catch (err) {
    logger.logError('MCP connection test failed', err);
    res.status(400).json({ success: false, error: err.message });
  }
}

async function refreshTools(req, res, next) {
  try {
    const { id } = req.params;
    const server = await db('mcp_servers').where({ id }).first();
    if (!server) {
      return res.status(404).json({ error: 'MCP server not found' });
    }

    await disconnectClient(parseInt(id, 10));
    const tools = await discoverTools(server);

    res.json({
      success: true,
      tool_count: tools.length,
      tools: tools.map((t) => ({ name: t.name, description: t.description })),
    });
  } catch (err) {
    logger.logError('MCP tool refresh failed', err);
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = { list, create, update, remove, test, refreshTools };
