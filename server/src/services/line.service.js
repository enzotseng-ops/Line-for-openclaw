const line = require('@line/bot-sdk');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const logger = require('../config/logger');
const { generateReply, getLLMSettings } = require('./llm/factory');
const { searchContext } = require('./rag.service');
const { isWithinSchedule } = require('./scheduler.service');

function getLineClient() {
  return new line.messagingApi.MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  });
}

function getLineBlobClient() {
  return new line.messagingApi.MessagingApiBlobClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  });
}

/**
 * Download media from LINE and save locally
 */
async function downloadMedia(messageId, lineUserId, messageType) {
  const blobClient = getLineBlobClient();
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
  const client = getLineClient();
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
      logger.error('Media download error:', err.message);
    }
  }

  await db('messages').insert(msgRecord);

  // Only handle AI reply for text messages
  if (message.type !== 'text') return;

  const aiEnabled = await shouldAIReply(lineUser);
  if (!aiEnabled) {
    logger.info(`AI reply skipped for user ${lineUserId} (mode: ${lineUser.mode})`);
    return;
  }

  // Get conversation history
  const history = await db('messages')
    .where({ line_user_id: lineUserId })
    .whereIn('message_type', ['text'])
    .orderBy('created_at', 'desc')
    .limit(20);

  history.reverse();

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
    logger.error('LLM error:', err.message);
    return;
  }

  // Send reply
  try {
    await client.replyMessage({
      replyToken,
      messages: [{ type: 'text', text: replyText }],
    });
  } catch (err) {
    logger.error('LINE reply error:', err.message);
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
