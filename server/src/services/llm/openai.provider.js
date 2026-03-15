const OpenAI = require('openai');

function buildMessages(userMessage, conversationHistory, ragContext, systemPrompt) {
  const messages = [{ role: 'system', content: systemPrompt }];

  const history = conversationHistory.slice(-10);
  for (const msg of history) {
    if (msg.direction === 'inbound') {
      messages.push({ role: 'user', content: msg.content || '' });
    } else if (msg.direction === 'outbound' && msg.content) {
      messages.push({ role: 'assistant', content: msg.content });
    }
  }

  const currentContent = ragContext
    ? `[相關知識庫資訊]\n${ragContext}\n\n[用戶訊息]\n${userMessage}`
    : userMessage;

  messages.push({ role: 'user', content: currentContent });
  return messages;
}

async function generate(userMessage, conversationHistory, ragContext, settings) {
  const clientOptions = { apiKey: settings.apiKey };
  if (settings.baseUrl) clientOptions.baseURL = settings.baseUrl;
  const client = new OpenAI(clientOptions);

  const response = await client.chat.completions.create({
    model: settings.model,
    max_tokens: 1024,
    messages: buildMessages(userMessage, conversationHistory, ragContext, settings.systemPrompt),
  });

  return {
    text: response.choices[0].message.content,
    model: settings.model,
  };
}

async function test(settings) {
  const clientOptions = { apiKey: settings.apiKey };
  if (settings.baseUrl) clientOptions.baseURL = settings.baseUrl;
  const client = new OpenAI(clientOptions);
  const response = await client.chat.completions.create({
    model: settings.model,
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Hi' }],
  });
  return { success: true, model: settings.model };
}

module.exports = { generate, test };
