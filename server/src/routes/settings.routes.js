const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { list, updateOne, testLLM, testLine, lineQuota } = require('../controllers/settings.controller');

router.use(auth);
router.get('/', list);
router.get('/llm/test', testLLM);
router.get('/line/test', testLine);
router.get('/line/quota', lineQuota);
router.patch('/:key', updateOne);

module.exports = router;
