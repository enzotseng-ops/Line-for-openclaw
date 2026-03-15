const line = require('@line/bot-sdk');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const logger = require('../config/logger');
const { generateReply, getLLMSettings } = require('./llm/factory');
const { searchContext } = require('./rag.service');
const { isWithinSchedule } = require('./scheduler.service');
const { getSetting } = require('./settings.service');

async function getLineClient() {
  const token = await getSetting('line_channel_access_token');
  return new line.messagingApi.MessagingApiClient({
    channelAccessToken: token,
  });
}

async function getLineBlobClient() {
  const token = await getSetting('line_channel_access_token');
  return new line.messagingApi.MessagingApiBlobClient({
    channelAccessToken: token,
  });
}

/**
 * Download media from LINE and save locally
 */
async function downloadMedia(messageId, lineUserId, messageType) {
  const blobClient = await getLineBlobClient();
  const stream = await blobClient.getMessageContent(messageId);

  const extMap = { image: 'jpg', video: 'mp4', audio: 'm4a', file: 'bin' };
  const ext = extMap[messageType] || 'bin';
  const dir = path.join(__dirname, '../../uploads/media', lineUserId);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${Date.now()}_${messageId}.${ext}`;
  const filePath = path.join(dir, filename);

  await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => {
      fs.writeFileSync(filePath, Buffer.concat(chunks));
      resolve();
    });
    stream.on('error', reject);
  });

  return `/uploads/media/${lineUserId}/${filename}`;
}

/**
 * Upsert LINE user into DB
 */
async function upsertLineUser(profile) {
  const existing = await db('line_users').where({ line_user_id: profile.userId }).first();

  if (!existing) {
    await db('line_users').insert({
      line_user_id: profile.userId,
      display_name: profile.displayName,
      picture_url: profile.pictureUrl,
      first_message_at: new Date(),
      last_message_at: new Date(),
    });
  } else {
    await db('line_users').where({ line_user_id: profile.userId }).update({
      display_name: profile.displayName,
      picture_url: profile.pictureUrl,
      last_message_at: new Date(),
      updated_at: new Date(),
    });
  }

  return db('line_users').where({ line_user_id: profile.userId }).first();
}

/**
 * Check if AI should reply based on global switch, schedule, and user mode
 */
async function shouldAIReply(lineUser) {
  // 1. Global switch
  const globalSwitch = await db('system_settings').where({ key: 'global_ai_enabled' }).first();
  if (!globalSwitch || globalSwitch.value !== 'true') return false;

  // 2. Schedule
  const withinSchedule = await isWithinSchedule();
  if (!withinSchedule) return false;

  // 3. User mode
  if (lineUser.mode !== 'ai') return false;
  if (!lineUser.is_active) return false;

  return true;
}

/**
 * Handle incoming LINE message event
 */
async function handleMessageEvent(event) {
  const { replyToken, source, message } = event;
  const lineUserId = source.userId;

  // Get user profile
  const client = await getLineClient();

  // Mark messages as read
  client.markMessagesAsRead({ chat: { userId: lineUserId } })
    .catch((err) => logger.debug('markAsRead skipped:', err.message));

  let profile;
  try {
    profile = await client.getProfile(lineUserId);
  } catch (err) {
    profile = { userId: lineUserId, displayName: 'Unknown', pictureUrl: null };
  }

  // Upsert user
  const lineUser = await upsertLineUser(profile);

  // Build inbound message record
  const msgRecord = {
    line_user_id: lineUserId,
    direction: 'inbound',
    message_type: message.type,
    line_message_id: message.id,
    created_at: new Date(),
  };

  if (message.type === 'text') {
    msgRecord.content = message.text;
  } else if (['image', 'video', 'audio', 'file'].includes(message.type)) {
    try {
      const mediaPath = await downloadMedia(message.id, lineUserId, message.type);
      msgRecord.media_url = mediaPath;
    } catch (err) {
      logger.logError('Media download error', err);
    }
  }

  await db('messages').insert(msgRecord);

  // Only handle AI reply for text messages
  if (message.type !== 'text') return;

  // Check message length limit
  const maxLenStr = await getSetting('max_message_length');
  const maxLen = parseInt(maxLenStr, 10) || 500;
  if (message.text.length > maxLen) {
    try {
      await client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: `訊息太長，請將內容控制在 ${maxLen} 字以內。` }],
      });
    } catch (err) {
      logger.logError('LINE reply error (too long)', err);
    }
    return;
  }

  const aiEnabled = await shouldAIReply(lineUser);
  logger.info(`AI reply check: user=${lineUserId}, mode=${lineUser.mode}, active=${lineUser.is_active}, result=${aiEnabled}`);
  if (!aiEnabled) {
    return;
  }

  // Show loading animation while AI is generating reply
  client.showLoadingAnimation({ chatId: lineUserId, loadingSeconds: 30 })
    .catch((err) => logger.debug('showLoadingAnimation skipped:', err.message));

  // Get conversation history for LLM context
  const historyLimitStr = await getSetting('conversation_history_limit');
  const historyLimit = parseInt(historyLimitStr, 10) || 20;
  const history = await db('messages')
    .where({ line_user_id: lineUserId })
    .whereIn('message_type', ['text'])
    .orderBy('created_at', 'desc')
    .limit(historyLimit);

  history.reverse(); // chronological order for LLM context

  // RAG search
  const ragContext = await searchContext(message.text);

  // Generate AI reply
  let replyText;
  let modelUsed;
  try {
    const result = await generateReply(message.text, history, ragContext);
    replyText = result.text;
    modelUsed = result.model;
  } catch (err) {
    logger.logError('LLM error', err);
    return;
  }

  // Send reply
  try {
    await client.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: replyText }],
    });
  } catch (err) {
    logger.logError('LINE reply error', err);
    return;
  }

  // Save outbound message
  await db('messages').insert({
    line_user_id: lineUserId,
    direction: 'outbound',
    message_type: 'text',
    content: replyText,
    reply_source: 'ai',
    ai_model_used: modelUsed,
    created_at: new Date(),
  });
}

module.exports = { handleMessageEvent };
