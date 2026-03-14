const db = require('../config/db');

async function list(req, res, next) {
  try {
    const rules = await db('schedule_rules').orderBy('day_of_week').orderBy('start_time');
    res.json(rules);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { day_of_week, start_time, end_time, is_enabled = true } = req.body;
    if (day_of_week === undefined || !start_time || !end_time) {
      return res.status(400).json({ error: 'day_of_week, start_time, end_time are required' });
    }
    const [rule] = await db('schedule_rules').insert({ day_of_week, start_time, end_time, is_enabled }).returning('*');
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { day_of_week, start_time, end_time, is_enabled } = req.body;
    const updates = {};
    if (day_of_week !== undefined) updates.day_of_week = day_of_week;
    if (start_time) updates.start_time = start_time;
    if (end_time) updates.end_time = end_time;
    if (is_enabled !== undefined) updates.is_enabled = is_enabled;

    const [rule] = await db('schedule_rules').where({ id: req.params.id }).update(updates).returning('*');
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json(rule);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await db('schedule_rules').where({ id: req.params.id }).del();
    if (!deleted) return res.status(404).json({ error: 'Rule not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
