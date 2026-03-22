const { getSetting } = require('../settings.service');
const claudeProvider = require('./claude.provider');
const openaiProvider = require('./openai.provider');
const customProvider = require('./custom.provider');
const { getAllTools, callTool } = require('../mcp.service');
const logger = require('../../config/logger');

// OpenAI-compatible base URLs for each provider
const PROVIDER_BASE_URLS = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  minimax: 'https://api.minimaxi.chat/v1',
};

async function getLLMSettings() {
  const [provider, apiKey, model, systemPrompt, baseUrl] = await Promise.all([
    getSetting('llm_provider'),
    getSetting('llm_api_key'),
    getSetting('llm_model'),
    getSetting('system_prompt'),
    getSetting('custom_llm_base_url'),
  ]);

  return {
    provider: provider || 'claude',
    apiKey: apiKey || '',
    model: model || 'claude-sonnet-4-5',
    systemPrompt: systemPrompt || '你是一個智能客服助理。',
    baseUrl: baseUrl || '',
  };
}

/**
 * Convert MCP tools to Claude tool format.
 */
function toClaudeTools(mcpTools) {
  return mcpTools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));
}

/**
 * Convert MCP tools to OpenAI tool format.
 */
function toOpenAITools(mcpTools) {
  return mcpTools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));
}

async function generateReply(userMessage, conversationHistory, ragContext) {
  const settings = await getLLMSettings();

  // Fetch MCP tools from all enabled servers
  let mcpTools = [];
  try {
    mcpTools = await getAllTools();
  } catch (err) {
    logger.warn(`MCP tool discovery failed: ${err.message}`);
  }

  const mcp = { callTool };

  switch (settings.provider) {
    case 'claude':
      return claudeProvider.generate(userMessage, conversationHistory, ragContext, settings, {
        tools: toClaudeTools(mcpTools),
        ...mcp,
      });
    case 'openai':
      return openaiProvider.generate(userMessage, conversationHistory, ragContext, settings, {
        tools: toOpenAITools(mcpTools),
        ...mcp,
      });
    case 'gemini':
    case 'minimax':
      return openaiProvider.generate(userMessage, conversationHistory, ragContext, {
        ...settings,
        baseUrl: PROVIDER_BASE_URLS[settings.provider],
      }, {
        tools: toOpenAITools(mcpTools),
        ...mcp,
      });
    case 'custom':
      return customProvider.generate(userMessage, conversationHistory, ragContext, settings, {
        tools: toOpenAITools(mcpTools),
        ...mcp,
      });
    default:
      return claudeProvider.generate(userMessage, conversationHistory, ragContext, settings, {
        tools: toClaudeTools(mcpTools),
        ...mcp,
      });
  }
}

async function testConnection() {
  const settings = await getLLMSettings();

  switch (settings.provider) {
    case 'claude':
      return claudeProvider.test(settings);
    case 'openai':
      return openaiProvider.test(settings);
    case 'gemini':
    case 'minimax':
      return openaiProvider.test({
        ...settings,
        baseUrl: PROVIDER_BASE_URLS[settings.provider],
      });
    case 'custom':
      return customProvider.test(settings);
    default:
      throw new Error('Unknown provider');
  }
}

module.exports = { generateReply, testConnection, getLLMSettings };
