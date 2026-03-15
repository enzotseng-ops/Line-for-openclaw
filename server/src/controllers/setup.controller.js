const db = require('../config/db');
const { encrypt } = require('../config/encryption');
const { invalidate, getSetting } = require('../services/settings.service');
const logger = require('../config/logger');

/**
 * Check system setup status — no auth required.
 * Returns which components are configured and which are missing.
 */
async function status(req, res, next) {
  try {
    const checks = {
      database: false,
      admin: false,
      line: false,
      llm: false,
      setupComplete: false,
    };

    // 1. Database connectivity
    try {
      await db.raw('SELECT 1');
      checks.database = true;
    } catch {
      return res.json(checks);
    }

    // 2. Admin account exists
    const adminCount = await db('users').count('id as count').first();
    checks.admin = parseInt(adminCount.count) > 0;

    // 3. LINE credentials configured
    const lineSecret = await getSetting('line_channel_secret');
    const lineToken = await getSetting('line_channel_access_token');
    checks.line = Boolean(lineSecret && lineToken);

    // 4. LLM configured
    const llmKey = await getSetting('llm_api_key');
    const llmProvider = await getSetting('llm_provider');
    checks.llm = Boolean(llmKey && llmProvider);

    // Overall completion
    checks.setupComplete = checks.database && checks.admin && checks.line && checks.llm;

    res.json(checks);
  } catch (err) {
    logger.error('Setup status check failed:', err.message);
    next(err);
  }
}

/**
 * Batch initialize settings — requires auth.
 * Accepts an object of key-value pairs to save into system_settings.
 */
async function initialize(req, res, next) {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object is required' });
    }

    const ENCRYPTED_KEYS = [
      'llm_api_key',
      'google_file_search_api_key',
      'line_channel_secret',
      'line_channel_access_token',
    ];

    const results = [];

    for (const [key, rawValue] of Object.entries(settings)) {
      if (rawValue === undefined || rawValue === null || rawValue === '') continue;

      const value = ENCRYPTED_KEYS.includes(key) ? encrypt(rawValue) : rawValue;

      const existing = await db('system_settings').where({ key }).first();
      if (!existing) {
        await db('system_settings').insert({ key, value, updated_at: new Date() });
      } else {
        await db('system_settings').where({ key }).update({ value, updated_at: new Date() });
      }

      invalidate(key);
      results.push(key);
    }

    res.json({ updated: results });
  } catch (err) {
    logger.error('Setup initialize failed:', err.message);
    next(err);
  }
}

module.exports = { status, initialize };
