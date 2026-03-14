const db = require('../config/db');
const fs = require('fs');
const { uploadFile, deleteFile } = require('../services/rag.service');
const logger = require('../config/logger');

async function list(req, res, next) {
  try {
    const files = await db('uploaded_files')
      .leftJoin('users', 'uploaded_files.uploaded_by', 'users.id')
      .select('uploaded_files.*', 'users.name as uploader_name')
      .orderBy('uploaded_files.created_at', 'desc');
    res.json(files);
  } catch (err) {
    next(err);
  }
}

async function upload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, path: storedPath, size, mimetype } = req.file;

    const [record] = await db('uploaded_files').insert({
      original_name: originalname,
      stored_path: storedPath,
      file_size: size,
      mime_type: mimetype,
      status: 'processing',
      uploaded_by: req.user.id,
    }).returning('*');

    // Upload to RAG async
    (async () => {
      try {
        const googleFileId = await uploadFile(storedPath, originalname);
        await db('uploaded_files').where({ id: record.id }).update({
          google_file_id: googleFileId,
          status: 'ready',
        });
        logger.info(`File uploaded to RAG: ${originalname} (${googleFileId})`);
      } catch (err) {
        logger.error('RAG upload error:', err.message);
        await db('uploaded_files').where({ id: record.id }).update({ status: 'error' });
      }
    })();

    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const file = await db('uploaded_files').where({ id: req.params.id }).first();
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Delete from RAG
    if (file.google_file_id) {
      await deleteFile(file.google_file_id);
    }

    // Delete local file
    if (file.stored_path && fs.existsSync(file.stored_path)) {
      fs.unlinkSync(file.stored_path);
    }

    await db('uploaded_files').where({ id: req.params.id }).del();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, upload, remove };
