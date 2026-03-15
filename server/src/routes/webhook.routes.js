const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/webhook.controller');

// GET: health check / browser access
router.get('/line', (req, res) => {
  res.json({ status: 'ok', message: 'LINE Webhook endpoint is active. Use POST to send events.' });
});

// POST: LINE Webhook events
router.post('/line', express.raw({ type: '*/*' }), (req, res, next) => {
  const raw = req.body;
  req.rawBody = raw;
  try {
    req.body = raw.length > 0 ? JSON.parse(raw.toString('utf8')) : { events: [] };
  } catch {
    req.body = { events: [] };
  }
  next();
}, handleWebhook);

module.exports = router;
