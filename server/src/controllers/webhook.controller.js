const crypto = require('crypto');
const { handleMessageEvent } = require('../services/line.service');
const { getSetting } = require('../services/settings.service');
const logger = require('../config/logger');

async function verifySignature(body, signature) {
  const channelSecret = await getSetting('line_channel_secret');
  if (!channelSecret) {
    logger.warn('LINE_CHANNEL_SECRET not configured');
    return false;
  }
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}

async function handleWebhook(req, res) {
  const signature = req.headers['x-line-signature'];
  const rawBody = req.rawBody;

  if (!(await verifySignature(rawBody, signature))) {
    logger.warn('Invalid LINE signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  res.status(200).json({ status: 'ok' });

  // Process events asynchronously
  const events = req.body.events || [];
  logger.info(`Webhook received ${events.length} event(s)`);
  for (const event of events) {
    logger.info(`Event: type=${event.type}, messageType=${event.message?.type}`);
    if (event.type === 'message') {
      handleMessageEvent(event).catch((err) =>
        logger.error('Event processing error:', err.message, err.stack)
      );
    }
  }
}

module.exports = { handleWebhook };
