const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const logger = require('../config/logger');

async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existing = await db('users').where({ email }).first();
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [user] = await db('users').insert({ email, password_hash, name }).returning(['id', 'email', 'name', 'created_at']);

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db('users').where({ email }).first();
    if (!user) {
      logger.warn(`Login failed (unknown email): ip=${req.ip}, email=${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      logger.warn(`Login failed (wrong password): ip=${req.ip}, email=${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await db('users').where({ id: req.user.id }).select('id', 'email', 'name', 'created_at').first();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '請輸入目前密碼和新密碼' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: '新密碼至少需要 8 個字元' });
    }

    const user = await db('users').where({ id: req.user.id }).first();
    if (!user) {
      return res.status(404).json({ error: '找不到使用者' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '目前密碼不正確' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await db('users').where({ id: req.user.id }).update({
      password_hash,
      updated_at: new Date(),
    });

    res.json({ success: true, message: '密碼已更新' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, changePassword };
