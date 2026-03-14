const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { list, getOne, updateMode, updateNote } = require('../controllers/lineUsers.controller');

router.use(auth);
router.get('/', list);
router.get('/:id', getOne);
router.patch('/:id/mode', updateMode);
router.patch('/:id/note', updateNote);

module.exports = router;
