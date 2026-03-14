const db = require('../../config/db');
const { decrypt } = require('../../config/encryption');
const claudeProvider = require('./claude.provider');
const openaiProvider = require('./openai.provider');
const customProvider = require('./custom.provider');

async function getLLMSettings() {
  const rows = await db('system_settings')
    .whereIn('key', ['llm_provider', 'llm_api_key', 'llm_model', 'system_prompt', 'custom_llm_base_url']);

  const settings = {};
  rows.forEach((r) => {
    settings[r.key] = r.value;
  });

  return {
    provider: settings.llm_provider || 'claude',
    apiKey: decrypt(settings.llm_api_key || ''),
    model: settings.llm_model || 'claude-sonnet-4-20250514',
    systemPrompt: settings.system_prompt || '你是一個智能客服助理。',
    baseUrl: settings.custom_llm_base_url || '',
  };
}

async function generateReply(userMessage, conversationHistory, ragContext) {
  const settings = await getLLMSettings();

  switch (settings.provider) {
    case 'claude':
      return claudeProvider.generate(userMessage, conversationHistory, ragContext, settings);
    case 'openai':
      return openaiProvider.generate(userMessage, conversationHistory, ragContext, settings);
    case 'custom':
      return customProvider.generate(userMessage, conversationHistory, ragContext, settings);
    default:
      return claudeProvider.generate(userMessage, conversationHistory, ragContext, settings);
  }
}

async function testConnection() {
  const settings = await getLLMSettings();

  switch (settings.provider) {
    case 'claude':
      return claudeProvider.test(settings);
    case 'openai':
      return openaiProvider.test(settings);
    case 'custom':
      return customProvider.test(settings);
    default:
      throw new Error('Unknown provider');
  }
}

module.exports = { generateReply, testConnection, getLLMSettings };
