const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '../../.env');

const JWT_PLACEHOLDERS = ['your-jwt-secret-key-change-in-production', ''];

/**
 * Ensure required environment variables are set.
 * - DATABASE_URL: hard fail if missing (user must provide)
 * - JWT_SECRET: auto-generate if missing or placeholder
 * - ENCRYPTION_KEY: auto-generate if missing or empty
 */
function ensureEnv() {
  // DATABASE_URL: if missing, enter Setup Mode instead of crashing
  if (!process.env.DATABASE_URL) {
    process.env.SETUP_MODE = 'true';
    console.log('[env] DATABASE_URL not set — starting in Setup Mode');
    console.log('[env] Open http://localhost:' + (process.env.PORT || 3000) + ' to configure');
  }

  let envContent = '';
  try {
    envContent = fs.readFileSync(ENV_PATH, 'utf8');
  } catch {
    // .env file doesn't exist yet — will be created
  }

  let modified = false;

  // JWT_SECRET: auto-generate if missing or placeholder
  if (!process.env.JWT_SECRET || JWT_PLACEHOLDERS.includes(process.env.JWT_SECRET)) {
    const secret = crypto.randomBytes(48).toString('base64');
    process.env.JWT_SECRET = secret;
    envContent = upsertEnvLine(envContent, 'JWT_SECRET', secret);
    modified = true;
    console.log('[env] Auto-generated JWT_SECRET and saved to .env');
  }

  // ENCRYPTION_KEY: auto-generate only if missing or empty (never replace existing value)
  if (!process.env.ENCRYPTION_KEY) {
    const key = crypto.randomBytes(32).toString('hex');
    process.env.ENCRYPTION_KEY = key;
    envContent = upsertEnvLine(envContent, 'ENCRYPTION_KEY', key);
    modified = true;
    console.log('[env] Auto-generated ENCRYPTION_KEY and saved to .env');
    console.log('[env] IMPORTANT: Back up your ENCRYPTION_KEY! If lost, encrypted DB data becomes unreadable.');
  }

  // Persist to .env file
  if (modified) {
    try {
      fs.writeFileSync(ENV_PATH, envContent, 'utf8');
    } catch (err) {
      console.warn(`[env] Could not write to ${ENV_PATH}: ${err.message}`);
      console.warn('[env] Keys are set for this session but will not persist across restarts.');
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
