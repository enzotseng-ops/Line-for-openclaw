const OpenAI = require('openai');
const logger = require('../../config/logger');

const MAX_TOOL_ROUNDS = 5;

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

async function generate(userMessage, conversationHistory, ragContext, settings, mcp = {}) {
  const clientOptions = { apiKey: settings.apiKey };
  if (settings.baseUrl) clientOptions.baseURL = settings.baseUrl;
  const client = new OpenAI(clientOptions);

  const messages = buildMessages(userMessage, conversationHistory, ragContext, settings.systemPrompt);
  const hasTools = mcp.tools && mcp.tools.length > 0;

  const requestParams = {
    model: settings.model,
    max_tokens: 1024,
    messages,
  };
  if (hasTools) {
    requestParams.tools = mcp.tools;
  }

  let response = await client.chat.completions.create(requestParams);
  let message = response.choices[0].message;

  // Tool-calling loop
  let rounds = 0;
  while (message.tool_calls && message.tool_calls.length > 0 && rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    // Add assistant message with tool calls
    messages.push(message);

    // Execute each tool call
    for (const toolCall of message.tool_calls) {
      const fnName = toolCall.function.name;
      let args = {};
      try {
        args = JSON.parse(toolCall.function.arguments || '{}');
      } catch {
        // ignore parse error
      }

      try {
        logger.info(`MCP tool call: ${fnName} (round ${rounds})`);
        const result = await mcp.callTool(fnName, args);
        const textContent = (result.content || [])
          .filter((c) => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: textContent || JSON.stringify(result),
        });
      } catch (err) {
        logger.warn(`MCP tool call failed: ${fnName} — ${err.message}`);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Error: ${err.message}`,
        });
      }
    }

    response = await client.chat.completions.create({
      ...requestParams,
      messages,
    });
    message = response.choices[0].message;
  }

  return {
    text: message.content || '',
    model: settings.model,
  };
}

async function test(settings) {
  const clientOptions = { apiKey: settings.apiKey };
  if (settings.baseUrl) clientOptions.baseURL = settings.baseUrl;
  const client = new OpenAI(clientOptions);
  await client.chat.completions.create({
    model: settings.model,
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Hi' }],
  });
  return { success: true, model: settings.model };
}

module.exports = { generate, test };
