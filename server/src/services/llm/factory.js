const { getSetting } = require('../settings.service');
const claudeProvider = require('./claude.provider');
const openaiProvider = require('./openai.provider');
const customProvider = require('./custom.provider');

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

async function generateReply(userMessage, conversationHistory, ragContext) {
  const settings = await getLLMSettings();

  switch (settings.provider) {
    case 'claude':
      return claudeProvider.generate(userMessage, conversationHistory, ragContext, settings);
    case 'openai':
      return openaiProvider.generate(userMessage, conversationHistory, ragContext, settings);
    case 'gemini':
    case 'minimax':
      return openaiProvider.generate(userMessage, conversationHistory, ragContext, {
        ...settings,
        baseUrl: PROVIDER_BASE_URLS[settings.provider],
      });
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
