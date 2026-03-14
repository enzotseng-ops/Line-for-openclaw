const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { list, create, update, remove } = require('../controllers/schedules.controller');

router.use(auth);
router.get('/', list);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);

module.exports = router;
