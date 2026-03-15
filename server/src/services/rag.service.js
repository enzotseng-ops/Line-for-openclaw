const { GoogleGenAI } = require('@google/genai');
const { getSetting } = require('./settings.service');
const logger = require('../config/logger');

const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const RAG_MODEL = 'gemini-2.5-flash-lite';

async function getRAGSettings() {
  const [apiKey, fileSearchStoreName] = await Promise.all([
    getSetting('google_file_search_api_key'),
    getSetting('google_assistant_id'),
  ]);

  return {
    apiKey: apiKey || '',
    // google_assistant_id stores the File Search Store name, e.g. "fileSearchStores/my-store-123"
    fileSearchStoreName: fileSearchStoreName || '',
  };
}

/**
 * Search relevant context from RAG using Google Gemini File Search
 */
async function searchContext(query) {
  const result = await searchContextDetailed(query);
  return result.hit ? result.context : null;
}

/**
 * Detailed RAG search using Google Gemini File Search tool.
 * Returns { hit, context, citations, reason }
 */
async function searchContextDetailed(query) {
  try {
    const { apiKey, fileSearchStoreName } = await getRAGSettings();
    if (!apiKey || !fileSearchStoreName) {
      return {
        hit: false,
        context: null,
        citations: [],
        reason: 'RAG 尚未設定（請在設定頁填入 Google AI API Key 與 File Search Store Name）',
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: RAG_MODEL,
      contents: query,
      config: {
        tools: [{
          fileSearch: {
            fileSearchStoreNames: [fileSearchStoreName],
          },
        }],
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
      return { hit: false, context: null, citations: [], reason: 'No candidates in response' };
    }

    // Extract response text
    const contextText = candidate.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join('') || '';

    // Extract citations from grounding metadata
    const groundingChunks = candidate.groundingMetadata?.groundingChunks || [];
    const citations = groundingChunks
      .filter((c) => c.retrievedContext || c.web)
      .map((c) => ({
        text: c.retrievedContext?.text || c.web?.snippet || '',
        title: c.retrievedContext?.title || c.web?.title || '',
      }));

    const hit = citations.length > 0 || (groundingChunks.length > 0);

    return { hit, context: contextText, citations };
  } catch (err) {
    logger.logError('RAG search error', err);
    return { hit: false, context: null, citations: [], reason: err.message };
  }
}

/**
 * Upload a file to Google File Search Store.
 * Returns the document name for future deletion.
 */
async function uploadFile(filePath, filename) {
  const { apiKey, fileSearchStoreName } = await getRAGSettings();
  if (!apiKey) throw new Error('Google AI API Key not configured for RAG');
  if (!fileSearchStoreName) throw new Error('File Search Store Name not configured');

  const ai = new GoogleGenAI({ apiKey });
  const fs = require('fs');
  const os = require('os');
  const path = require('path');

  // The SDK passes the file path / displayName through HTTP headers which only
  // accept ASCII (ByteString). Copy the file to a temp path with an ASCII name
  // before uploading, then remove the temp file afterwards.
  const ext = path.extname(filename) || '.bin';
  const tmpPath = path.join(os.tmpdir(), `rag_upload_${Date.now()}${ext}`);
  fs.copyFileSync(filePath, tmpPath);

  let operation;
  try {
    operation = await ai.fileSearchStores.uploadToFileSearchStore({
      file: tmpPath,
      fileSearchStoreName,
      config: { displayName: `file_${Date.now()}${ext}` },
    });
  } finally {
    try { fs.unlinkSync(tmpPath); } catch (_) {}
  }

  // The operation completes synchronously and response.documentName is the
  // permanent document resource name we need for later deletion.
  const documentName = operation.response?.documentName || operation.name || '';
  if (!documentName) throw new Error('Upload succeeded but no documentName returned');

  logger.info(`File uploaded to Google File Search: ${filename} → ${documentName}`);
  return documentName;
}

/**
 * Delete a document from Google File Search Store via REST API.
 */
async function deleteFile(documentName) {
  try {
    const { apiKey } = await getRAGSettings();
    if (!apiKey || !documentName) return;

    await fetch(`${GOOGLE_API_BASE}/${documentName}?key=${apiKey}`, {
      method: 'DELETE',
    });
    logger.info(`Deleted Google File Search document: ${documentName}`);
  } catch (err) {
    logger.logError('RAG delete file error', err);
  }
}

module.exports = { searchContext, searchContextDetailed, uploadFile, deleteFile };
