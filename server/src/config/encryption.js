const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required (64-char hex string)');
}
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encrypted) {
  if (!encrypted) return '';
  const parts = encrypted.split(':');
  if (parts.length !== 3) return encrypted; // not encrypted
  try {
    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // ENCRYPTION_KEY changed or data corrupted — return empty so env fallback can kick in
    const preview = encrypted.substring(0, 8);
    console.error(
      `[encryption] decrypt failed (${err.message}). ` +
      `Data prefix: ${preview}... — ENCRYPTION_KEY may have changed. ` +
      'Please re-enter this setting via the admin panel.'
    );
    return '';
  }
}

module.exports = { encrypt, decrypt };
