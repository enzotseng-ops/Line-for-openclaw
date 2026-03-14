const OpenAI = require('openai');
const db = require('../config/db');
const { decrypt } = require('../config/encryption');
const logger = require('../config/logger');

async function getRAGSettings() {
  const rows = await db('system_settings')
    .whereIn('key', ['google_file_search_api_key', 'google_assistant_id']);

  const settings = {};
  rows.forEach((r) => { settings[r.key] = r.value; });

  return {
    apiKey: decrypt(settings.google_file_search_api_key || ''),
    assistantId: settings.google_assistant_id || '',
  };
}

/**
 * Search relevant context from RAG using OpenAI Assistants API File Search
 */
async function searchContext(query) {
  try {
    const { apiKey, assistantId } = await getRAGSettings();
    if (!apiKey || !assistantId) return null;

    const client = new OpenAI({ apiKey });

    // Create a thread and run with file search
    const thread = await client.beta.threads.create({
      messages: [{ role: 'user', content: query }],
    });

    const run = await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistantId,
    });

    if (run.status !== 'completed') return null;

    const messages = await client.beta.threads.messages.list(thread.id);
    const assistantMsg = messages.data.find((m) => m.role === 'assistant');
    if (!assistantMsg) return null;

    const content = assistantMsg.content[0];
    if (content.type !== 'text') return null;

    // Extract only annotations (citations) text
    return content.text.value;
  } catch (err) {
    logger.error('RAG search error:', err.message);
    return null;
  }
}

/**
 * Upload a file to OpenAI for File Search
 */
async function uploadFile(filePath, filename) {
  const { apiKey, assistantId } = await getRAGSettings();
  if (!apiKey) throw new Error('OpenAI API Key not configured for RAG');

  const client = new OpenAI({ apiKey });
  const fs = require('fs');

  const file = await client.files.create({
    file: fs.createReadStream(filePath),
    purpose: 'assistants',
  });

  // Get the assistant's vector store and add the file
  if (assistantId) {
    const assistant = await client.beta.assistants.retrieve(assistantId);
    const vectorStoreIds = assistant.tool_resources?.file_search?.vector_store_ids || [];

    if (vectorStoreIds.length > 0) {
      await client.beta.vectorStores.files.create(vectorStoreIds[0], {
        file_id: file.id,
      });
    } else {
      // Create a new vector store and attach to assistant
      const vectorStore = await client.beta.vectorStores.create({
        name: 'Knowledge Base',
        file_ids: [file.id],
      });

      await client.beta.assistants.update(assistantId, {
        tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
      });
    }
  }

  return file.id;
}

/**
 * Delete a file from OpenAI
 */
async function deleteFile(googleFileId) {
  try {
    const { apiKey } = await getRAGSettings();
    if (!apiKey || !googleFileId) return;

    const client = new OpenAI({ apiKey });
    await client.files.del(googleFileId);
  } catch (err) {
    logger.error('RAG delete file error:', err.message);
  }
}

module.exports = { searchContext, uploadFile, deleteFile };
