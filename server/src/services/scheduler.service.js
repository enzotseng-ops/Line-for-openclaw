const db = require('../config/db');

/**
 * Check if current time is within any enabled schedule rule
 */
async function isWithinSchedule() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const rules = await db('schedule_rules')
    .where({ day_of_week: dayOfWeek, is_enabled: true });

  for (const rule of rules) {
    if (currentTime >= rule.start_time.substring(0, 5) && currentTime <= rule.end_time.substring(0, 5)) {
      return true;
    }
  }
  return false;
}

module.exports = { isWithinSchedule };
