require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('../src/config/db');
const { decrypt } = require('../src/config/encryption');

async function main() {
  const rows = await db('system_settings').whereIn('key', ['google_file_search_api_key', 'google_assistant_id']);
  const s = {};
  rows.forEach(r => { s[r.key] = r.value; });
  const apiKey = decrypt(s.google_file_search_api_key || '');
  const fileSearchStoreName = s.google_assistant_id || '';
  console.log('Store:', fileSearchStoreName);

  const ai = new GoogleGenAI({ apiKey });
  const files = fs.readdirSync(path.resolve(__dirname, '../uploads/knowledge')).filter(f => f.endsWith('.pdf'));
  const src = path.resolve(__dirname, '../uploads/knowledge/' + files[files.length - 1]);
  const tmpPath = path.join(os.tmpdir(), 'test_rag_upload.pdf');
  fs.copyFileSync(src, tmpPath);

  const op = await ai.fileSearchStores.uploadToFileSearchStore({
    file: tmpPath,
    fileSearchStoreName,
    config: { displayName: 'test_file.pdf' },
  });
  try { fs.unlinkSync(tmpPath); } catch (_) {}

  console.log('operation keys:', Object.keys(op));
  console.log('operation:', JSON.stringify(op, null, 2));
  process.exit(0);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
