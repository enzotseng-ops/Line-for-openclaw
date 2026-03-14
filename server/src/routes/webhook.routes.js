const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/webhook.controller');

// Capture rawBody for signature verification
router.post('/line', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body;
  req.body = JSON.parse(req.body.toString('utf8'));
  next();
}, handleWebhook);

module.exports = router;
