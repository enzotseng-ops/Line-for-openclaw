const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * Rate limiter for login endpoint.
 * Default: 10 attempts per IP per 15 minutes.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '登入嘗試過多，請 15 分鐘後再試。' },
  handler: (req, res, next, options) => {
    logger.warn(`Login rate limit exceeded: ip=${req.ip}, email=${req.body?.email || 'unknown'}`);
    res.status(429).json(options.message);
  },
});

/**
 * Rate limiter for register endpoint.
 * Default: 3 attempts per IP per hour.
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '註冊嘗試過多，請 1 小時後再試。' },
  handler: (req, res, next, options) => {
    logger.warn(`Register rate limit exceeded: ip=${req.ip}`);
    res.status(429).json(options.message);
  },
});

module.exports = { loginLimiter, registerLimiter };
