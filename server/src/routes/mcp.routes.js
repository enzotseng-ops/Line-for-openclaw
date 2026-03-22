const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { list, create, update, remove, test, refreshTools } = require('../controllers/mcp.controller');

router.use(auth);
router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/:id/test', test);
router.post('/:id/refresh-tools', refreshTools);

module.exports = router;
