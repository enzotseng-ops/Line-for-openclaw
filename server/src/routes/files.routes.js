const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const { list, upload, remove } = require('../controllers/files.controller');
const { searchContextDetailed } = require('../services/rag.service');
const { generateReply, getLLMSettings } = require('../services/llm/factory');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/knowledge'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    // multer encodes filename as latin1; convert back to UTF-8 for Chinese filenames
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${uniqueSuffix}_${originalname}`);
  },
});

const multerUpload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.use(auth);
router.get('/', list);
router.post('/upload', multerUpload.single('file'), upload);
router.delete('/:id', remove);

/**
 * POST /api/files/test-query
 * Test a query against the RAG knowledge base and generate an LLM response.
 * Returns detailed hit/miss info for debugging.
 */
router.post('/test-query', async (req, res) => {
  const { query } = req.body;
  if (!query || !query.trim()) {
    return res.status(400).json({ error: '請輸入查詢內容' });
  }

  try {
    // 1. Detailed RAG search
    const ragResult = await searchContextDetailed(query.trim());

    // 2. LLM generate reply (no conversation history for test queries)
    const llmSettings = await getLLMSettings();
    const llmResult = await generateReply(query.trim(), [], ragResult.hit ? ragResult.context : null);

    return res.json({
      ragHit: ragResult.hit,
      ragContext: ragResult.context,
      ragCitations: ragResult.citations || [],
      ragReason: ragResult.reason || null,
      response: llmResult.text,
      model: llmResult.model,
      provider: llmSettings.provider,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
