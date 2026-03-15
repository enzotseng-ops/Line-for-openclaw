/**
 * Settings service with DB-first lookup and env fallback.
 * Caches values for 60 seconds to avoid repeated DB queries on every request.
 */
const db = require('../config/db');
const { decrypt } = require('../config/encryption');

const cache = new Map(); // key → { value, expiresAt }
const CACHE_TTL_MS = 60_000; // 60 seconds

const ENCRYPTED_KEYS = ['llm_api_key', 'google_file_search_api_key', 'line_channel_secret', 'line_channel_access_token'];

const ENV_FALLBACKS = {
  line_channel_secret: 'LINE_CHANNEL_SECRET',
  line_channel_access_token: 'LINE_CHANNEL_ACCESS_TOKEN',
};

/**
 * Get a setting value. DB takes priority over env var.
 * Encrypted keys are automatically decrypted.
 */
async function getSetting(key) {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  try {
    const row = await db('system_settings').where({ key }).first();
    let value = row?.value || null;

    if (value && ENCRYPTED_KEYS.includes(key)) {
      value = decrypt(value);
    }

    // Fall back to env var if empty
    if (!value && ENV_FALLBACKS[key]) {
      value = process.env[ENV_FALLBACKS[key]] || null;
    }

    cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  } catch {
    // DB unavailable - fall back to env
    const envKey = ENV_FALLBACKS[key];
    return envKey ? (process.env[envKey] || null) : null;
  }
}

/** Invalidate cache for a key (call after settings update) */
function invalidate(key) {
  cache.delete(key);
}

module.exports = { getSetting, invalidate };
