const Anthropic = require('@anthropic-ai/sdk');

function buildMessages(userMessage, conversationHistory, ragContext) {
  const messages = [];

  // Add conversation history (last 10)
  const history = conversationHistory.slice(-10);
  for (const msg of history) {
    if (msg.direction === 'inbound') {
      messages.push({ role: 'user', content: msg.content || '' });
    } else if (msg.direction === 'outbound' && msg.content) {
      messages.push({ role: 'assistant', content: msg.content });
    }
  }

  // Add current message
  const currentContent = ragContext
    ? `[相關知識庫資訊]\n${ragContext}\n\n[用戶訊息]\n${userMessage}`
    : userMessage;

  messages.push({ role: 'user', content: currentContent });
  return messages;
}

async function generate(userMessage, conversationHistory, ragContext, settings) {
  const client = new Anthropic({ apiKey: settings.apiKey });

  const response = await client.messages.create({
    model: settings.model,
    max_tokens: 1024,
    system: settings.systemPrompt,
    messages: buildMessages(userMessage, conversationHistory, ragContext),
  });

  return {
    text: response.content[0].text,
    model: settings.model,
  };
}

async function test(settings) {
  const client = new Anthropic({ apiKey: settings.apiKey });
  const response = await client.messages.create({
    model: settings.model,
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Hi' }],
  });
  return { success: true, model: settings.model };
}

module.exports = { generate, test };
