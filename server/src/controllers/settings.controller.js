const db = require('../config/db');
const { encrypt } = require('../config/encryption');
const { testConnection } = require('../services/llm/factory');
const logger = require('../config/logger');

const ENCRYPTED_KEYS = ['llm_api_key', 'google_file_search_api_key'];

async function list(req, res, next) {
  try {
    const settings = await db('system_settings').select('key', 'value', 'description', 'updated_at');

    // Mask encrypted values
    const masked = settings.map((s) => ({
      ...s,
      value: ENCRYPTED_KEYS.includes(s.key) && s.value ? '***encrypted***' : s.value,
    }));

    res.json(masked);
  } catch (err) {
    next(err);
  }
}

async function updateOne(req, res, next) {
  try {
    const { key } = req.params;
    let { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'value is required' });
    }

    // Encrypt sensitive keys
    if (ENCRYPTED_KEYS.includes(key) && value && value !== '***encrypted***') {
      value = encrypt(value);
    }

    // Don't update if masked value is sent back
    if (ENCRYPTED_KEYS.includes(key) && value === '***encrypted***') {
      return res.json({ key, updated: false, message: 'Value unchanged' });
    }

    const existing = await db('system_settings').where({ key }).first();
    if (!existing) {
      await db('system_settings').insert({ key, value, updated_at: new Date() });
    } else {
      await db('system_settings').where({ key }).update({ value, updated_at: new Date() });
    }

    res.json({ key, updated: true });
  } catch (err) {
    next(err);
  }
}

async function testLLM(req, res, next) {
  try {
    const result = await testConnection();
    res.json(result);
  } catch (err) {
    logger.error('LLM test failed:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = { list, updateOne, testLLM };
