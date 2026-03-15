const crypto = require('crypto');
const { handleMessageEvent } = require('../services/line.service');
const { getSetting } = require('../services/settings.service');
const logger = require('../config/logger');

async function verifySignature(body, signature) {
  const channelSecret = await getSetting('line_channel_secret');
  if (!channelSecret) {
    return { valid: false, reason: 'no_secret' };
  }
  if (!signature) {
    return { valid: false, reason: 'no_signature' };
  }
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');
  if (hash !== signature) {
    return { valid: false, reason: 'mismatch' };
  }
  return { valid: true };
}

async function handleWebhook(req, res) {
  const signature = req.headers['x-line-signature'];
  const rawBody = req.rawBody;

  const sigResult = await verifySignature(rawBody, signature);
  if (!sigResult.valid) {
    const hints = {
      no_secret: 'Channel Secret 尚未設定，請至管理後台「系統設定」填入。',
      no_signature: '請求缺少 x-line-signature header，確認 LINE Webhook URL 設定正確。',
      mismatch: '簽名驗證失敗。常見原因：(1) Channel Secret 與 Channel Access Token 不屬於同一個 Channel；'
        + '(2) Secret 複製時多了空白或換行；(3) Secret 來自 Basic Settings 頁面，Token 來自 Messaging API 頁面，請確認兩者屬於同一個 Channel。',
    };
    const hint = hints[sigResult.reason] || 'Unknown signature error';
    logger.warn(`Invalid LINE signature: ${sigResult.reason} — ${hint}`);
    return res.status(401).json({ error: 'Invalid signature', hint });
  }

  res.status(200).json({ status: 'ok' });

  // Process events asynchronously
  const events = req.body.events || [];
  logger.info(`Webhook received ${events.length} event(s)`);
  for (const event of events) {
    logger.info(`Event: type=${event.type}, messageType=${event.message?.type}`);
    if (event.type === 'message') {
      handleMessageEvent(event).catch((err) =>
        logger.logError('Event processing error', err)
      );
    }
  }
}

module.exports = { handleWebhook };
