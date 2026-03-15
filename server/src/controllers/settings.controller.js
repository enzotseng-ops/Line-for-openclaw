const db = require('../config/db');
const { encrypt } = require('../config/encryption');
const { testConnection } = require('../services/llm/factory');
const logger = require('../config/logger');
const line = require('@line/bot-sdk');

const { invalidate, getSetting } = require('../services/settings.service');

const ENCRYPTED_KEYS = ['llm_api_key', 'google_file_search_api_key', 'line_channel_secret', 'line_channel_access_token'];

async function list(req, res, next) {
  try {
    const settings = await db('system_settings').select('key', 'value', 'description', 'updated_at');

    // Mask encrypted values
    const masked = settings.map((s) => ({
      ...s,
      value: ENCRYPTED_KEYS.includes(s.key) && s.value ? '***encrypted***' : s.value,
    }));

    res.json(masked);
  } catch (err) {
    next(err);
  }
}

async function updateOne(req, res, next) {
  try {
    const { key } = req.params;
    let { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'value is required' });
    }

    // Encrypt sensitive keys
    if (ENCRYPTED_KEYS.includes(key) && value && value !== '***encrypted***') {
      value = encrypt(value);
    }

    // Don't update if masked value is sent back
    if (ENCRYPTED_KEYS.includes(key) && value === '***encrypted***') {
      return res.json({ key, updated: false, message: 'Value unchanged' });
    }

    const existing = await db('system_settings').where({ key }).first();
    if (!existing) {
      await db('system_settings').insert({ key, value, updated_at: new Date() });
    } else {
      await db('system_settings').where({ key }).update({ value, updated_at: new Date() });
    }

    // Invalidate settings cache so new value is used immediately
    invalidate(key);

    res.json({ key, updated: true });
  } catch (err) {
    next(err);
  }
}

async function testLLM(req, res, next) {
  try {
    const result = await testConnection();
    res.json(result);
  } catch (err) {
    logger.error('LLM test failed:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
}

async function testLine(req, res, next) {
  try {
    const token = await getSetting('line_channel_access_token');
    if (!token) {
      return res.status(400).json({ success: false, error: 'Channel Access Token 尚未設定' });
    }

    const secret = await getSetting('line_channel_secret');
    if (!secret) {
      return res.status(400).json({ success: false, error: 'Channel Secret 尚未設定' });
    }

    const client = new line.messagingApi.MessagingApiClient({ channelAccessToken: token });
    const botInfo = await client.getBotInfo();

    res.json({
      success: true,
      bot: {
        displayName: botInfo.displayName,
        userId: botInfo.userId,
        pictureUrl: botInfo.pictureUrl,
        chatMode: botInfo.chatMode,
        markAsReadMode: botInfo.markAsReadMode,
      },
    });
  } catch (err) {
    logger.error('LINE test failed:', err.message);
    const msg = err.statusCode === 401
      ? 'Channel Access Token 無效，請確認是否正確'
      : `LINE API 錯誤: ${err.message}`;
    res.status(400).json({ success: false, error: msg });
  }
}

module.exports = { list, updateOne, testLLM, testLine };
