/**
 * 一次性腳本：建立 Google Gemini File Search Store
 * 使用方式：
 *   GOOGLE_AI_API_KEY=AIza... node scripts/create-file-search-store.js "my-store-name"
 */
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function main() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  const displayName = process.argv[2] || 'line-knowledge-base';

  if (!apiKey) {
    console.error('❌ 請設定環境變數 GOOGLE_AI_API_KEY');
    console.error('   用法: GOOGLE_AI_API_KEY=AIza... node scripts/create-file-search-store.js "store-name"');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  console.log(`📦 正在建立 File Search Store: "${displayName}" ...`);
  const store = await ai.fileSearchStores.create({
    config: { displayName },
  });

  console.log('\n✅ 建立成功！');
  console.log('----------------------------------------');
  console.log(`Store Name:  ${store.name}`);
  console.log(`Display Name: ${store.displayName || displayName}`);
  console.log('----------------------------------------');
  console.log('\n👉 請將以下值複製到設定頁的「File Search Store Name」欄位：');
  console.log(`\n   ${store.name}\n`);
}

main().catch((err) => {
  console.error('❌ 錯誤:', err.message);
  process.exit(1);
});
