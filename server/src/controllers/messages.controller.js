const db = require('../config/db');
const { createObjectCsvStringifier } = require('csv-writer');

async function list(req, res, next) {
  try {
    const { line_user_id, start_date, end_date, message_type, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = db('messages')
      .leftJoin('line_users', 'messages.line_user_id', 'line_users.line_user_id');

    if (line_user_id) query = query.where('messages.line_user_id', line_user_id);
    if (message_type) query = query.where('messages.message_type', message_type);
    if (start_date) query = query.where('messages.created_at', '>=', new Date(start_date));
    if (end_date) query = query.where('messages.created_at', '<=', new Date(end_date));

    const total = await query.clone().count('messages.id as count').first();
    const messages = await query.clone()
      .select('messages.*', 'line_users.display_name', 'line_users.picture_url')
      .orderBy('messages.created_at', 'desc')
      .limit(limit).offset(offset);

    res.json({
      messages,
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

async function exportCSV(req, res, next) {
  try {
    const { line_user_id, start_date, end_date } = req.query;

    let query = db('messages')
      .leftJoin('line_users', 'messages.line_user_id', 'line_users.line_user_id')
      .select(
        'messages.id',
        'messages.line_user_id',
        'line_users.display_name',
        'messages.direction',
        'messages.message_type',
        'messages.content',
        'messages.media_url',
        'messages.reply_source',
        'messages.ai_model_used',
        'messages.created_at'
      )
      .orderBy('messages.created_at', 'asc');

    if (line_user_id) query = query.where('messages.line_user_id', line_user_id);
    if (start_date) query = query.where('messages.created_at', '>=', new Date(start_date));
    if (end_date) query = query.where('messages.created_at', '<=', new Date(end_date));

    const rows = await query;

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'id', title: 'id' },
        { id: 'line_user_id', title: 'line_user_id' },
        { id: 'display_name', title: 'display_name' },
        { id: 'direction', title: 'direction' },
        { id: 'message_type', title: 'message_type' },
        { id: 'content', title: 'content' },
        { id: 'media_url', title: 'media_url' },
        { id: 'reply_source', title: 'reply_source' },
        { id: 'ai_model_used', title: 'ai_model_used' },
        { id: 'created_at', title: 'created_at' },
      ],
    });

    const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="messages_${Date.now()}.csv"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  } catch (err) {
    next(err);
  }
}

async function dashboard(req, res, next) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayMsgs, todayUsers, aiOutbound, totalOutbound] = await Promise.all([
      db('messages').where('created_at', '>=', today).count('id as count').first(),
      db('messages').where('created_at', '>=', today).countDistinct('line_user_id as count').first(),
      db('messages').where({ direction: 'outbound', reply_source: 'ai' }).where('created_at', '>=', today).count('id as count').first(),
      db('messages').where({ direction: 'outbound' }).where('created_at', '>=', today).count('id as count').first(),
    ]);

    // Last 7 days trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trend = await db('messages')
      .where('created_at', '>=', sevenDaysAgo)
      .select(db.raw("DATE(created_at) as date"), db.raw('count(*) as count'))
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date', 'asc');

    res.json({
      today_messages: parseInt(todayMsgs.count),
      today_users: parseInt(todayUsers.count),
      ai_reply_count: parseInt(aiOutbound.count),
      total_reply_count: parseInt(totalOutbound.count),
      ai_ratio: parseInt(totalOutbound.count) > 0
        ? Math.round((parseInt(aiOutbound.count) / parseInt(totalOutbound.count)) * 100)
        : 0,
      trend,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, exportCSV, dashboard };
