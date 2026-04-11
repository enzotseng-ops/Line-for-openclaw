const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '../../.env');

const JWT_PLACEHOLDERS = ['your-jwt-secret-key-change-in-production', ''];

/**
 * Ensure required environment variables are set.
 * - DATABASE_URL: enter Setup Mode if missing (user configures via web UI)
 * - JWT_SECRET: auto-generate if missing or placeholder
 * - ENCRYPTION_KEY: auto-generate if missing or empty
 *
 * In container environments (Zeabur, Docker, etc.), env vars are injected
 * by the platform. File I/O is skipped when all required vars are present
 * or when the filesystem is read-only.
 */
function ensureEnv() {
  // DATABASE_URL: if missing, enter Setup Mode instead of crashing
  if (!process.env.DATABASE_URL) {
    process.env.SETUP_MODE = 'true';
    console.log('[env] DATABASE_URL not set — starting in Setup Mode');
    console.log('[env] Open http://localhost:' + (process.env.PORT || 8080) + ' to configure');
  }

  // If all crypto keys are already set (e.g. via Zeabur/Docker env injection),
  // skip all file I/O — no need to read or write .env
  const jwtOk = process.env.JWT_SECRET && !JWT_PLACEHOLDERS.includes(process.env.JWT_SECRET);
  const ekOk = !!process.env.ENCRYPTION_KEY;
  if (jwtOk && ekOk) {
    return;
  }

  // Auto-generate missing keys and try to persist to .env
  let envContent = '';
  try {
    envContent = fs.readFileSync(ENV_PATH, 'utf8');
  } catch {
    // .env file doesn't exist yet — will be created
  }

  let modified = false;

  // JWT_SECRET: auto-generate if missing or placeholder
  if (!jwtOk) {
    const secret = crypto.randomBytes(48).toString('base64');
    process.env.JWT_SECRET = secret;
    envContent = upsertEnvLine(envContent, 'JWT_SECRET', secret);
    modified = true;
    console.log('[env] Auto-generated JWT_SECRET');
  }

  // ENCRYPTION_KEY: auto-generate only if missing or empty (never replace existing value)
  if (!ekOk) {
    const key = crypto.randomBytes(32).toString('hex');
    process.env.ENCRYPTION_KEY = key;
    envContent = upsertEnvLine(envContent, 'ENCRYPTION_KEY', key);
    modified = true;
    console.log('[env] Auto-generated ENCRYPTION_KEY');
    console.log('[env] IMPORTANT: Back up your ENCRYPTION_KEY! If lost, encrypted DB data becomes unreadable.');
  }

  // Persist to .env file (best-effort — read-only filesystems are OK)
  if (modified) {
    try {
      fs.writeFileSync(ENV_PATH, envContent, 'utf8');
      console.log('[env] Keys saved to .env');
    } catch {
      // Container or read-only filesystem — keys live in process.env for this session
      console.log('[env] Keys set in memory (filesystem is read-only, skipping .env write)');
    }
  }
}

/**
 * Insert or update a KEY=value line in .env content string.
 */
function upsertEnvLine(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  if (regex.test(content)) {
    return content.replace(regex, line);
  }
  return content.trimEnd() + '\n' + line + '\n';
}

module.exports = ensureEnv;
