const db = require('../config/db');

async function list(req, res, next) {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = db('line_users').orderBy('last_message_at', 'desc');

    if (search) {
      query = query.where((builder) => {
        builder.where('display_name', 'ilike', `%${search}%`)
          .orWhere('line_user_id', 'ilike', `%${search}%`);
      });
    }

    const total = await query.clone().count('id as count').first();
    const users = await query.select('*').limit(limit).offset(offset);

    res.json({
      users,
      pagination: {
        total: parseInt(total.count),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const user = await db('line_users').where({ id: req.params.id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function updateMode(req, res, next) {
  try {
    const { mode } = req.body;
    if (!['ai', 'manual'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be ai or manual' });
    }
    await db('line_users').where({ id: req.params.id }).update({ mode, updated_at: new Date() });
    const user = await db('line_users').where({ id: req.params.id }).first();
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function updateNote(req, res, next) {
  try {
    const { note } = req.body;
    await db('line_users').where({ id: req.params.id }).update({ note, updated_at: new Date() });
    const user = await db('line_users').where({ id: req.params.id }).first();
    res.json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, updateMode, updateNote };
