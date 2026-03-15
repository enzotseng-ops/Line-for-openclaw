const db = require('../config/db');
const { getSetting } = require('./settings.service');
const logger = require('../config/logger');

/**
 * Check if a LINE user has exceeded the rate limit for AI replies.
 * Returns { allowed, remaining, resetInSeconds } or { allowed: false, ... }
 */
async function checkRateLimit(lineUserId) {
  const [maxStr, windowStr] = await Promise.all([
    getSetting('rate_limit_max_messages'),
    getSetting('rate_limit_window_minutes'),
  ]);

  const max = parseInt(maxStr, 10) || 10;
  const windowMinutes = parseInt(windowStr, 10) || 5;

  // 0 = disabled
  if (max <= 0) {
    return { allowed: true, remaining: Infinity, resetInSeconds: 0 };
  }

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  const result = await db('messages')
    .where({ line_user_id: lineUserId, direction: 'outbound', reply_source: 'ai' })
    .where('created_at', '>=', windowStart)
    .count('id as count')
    .first();

  const used = parseInt(result.count, 10) || 0;
  const remaining = Math.max(0, max - used);

  if (used >= max) {
    logger.info(`Rate limit hit: user=${lineUserId}, used=${used}/${max} in ${windowMinutes}min`);
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: windowMinutes * 60,
      used,
      max,
      windowMinutes,
    };
  }

  return { allowed: true, remaining, used, max, windowMinutes };
}

module.exports = { checkRateLimit };
