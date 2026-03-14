const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { list, updateOne, testLLM } = require('../controllers/settings.controller');

router.use(auth);
router.get('/', list);
router.get('/llm/test', testLLM);
router.patch('/:key', updateOne);

module.exports = router;
