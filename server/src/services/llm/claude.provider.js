const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../../config/logger');

const MAX_TOOL_ROUNDS = 5;

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

async function generate(userMessage, conversationHistory, ragContext, settings, mcp = {}) {
  const client = new Anthropic({ apiKey: settings.apiKey });
  const messages = buildMessages(userMessage, conversationHistory, ragContext);

  const hasTools = mcp.tools && mcp.tools.length > 0;
  const requestParams = {
    model: settings.model,
    max_tokens: 1024,
    system: settings.systemPrompt,
    messages,
  };
  if (hasTools) {
    requestParams.tools = mcp.tools;
  }

  let response = await client.messages.create(requestParams);

  // Tool-calling loop
  let rounds = 0;
  while (response.stop_reason === 'tool_use' && rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    // Collect all tool_use blocks
    const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');
    const toolResults = [];

    for (const toolUse of toolUseBlocks) {
      try {
        logger.info(`MCP tool call: ${toolUse.name} (round ${rounds})`);
        const result = await mcp.callTool(toolUse.name, toolUse.input);
        const textContent = (result.content || [])
          .filter((c) => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: textContent || JSON.stringify(result),
        });
      } catch (err) {
        logger.warn(`MCP tool call failed: ${toolUse.name} — ${err.message}`);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: `Error: ${err.message}`,
          is_error: true,
        });
      }
    }

    // Send tool results back to Claude
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await client.messages.create({
      ...requestParams,
      messages,
    });
  }

  // Extract final text response
  const textBlock = response.content.find((b) => b.type === 'text');
  return {
    text: textBlock ? textBlock.text : '',
    model: settings.model,
  };
}

async function test(settings) {
  const client = new Anthropic({ apiKey: settings.apiKey });
  await client.messages.create({
    model: settings.model,
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Hi' }],
  });
  return { success: true, model: settings.model };
}

module.exports = { generate, test };
