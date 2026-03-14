const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { list, exportCSV, dashboard } = require('../controllers/messages.controller');

router.use(auth);
router.get('/dashboard', dashboard);
router.get('/export', exportCSV);
router.get('/', list);

module.exports = router;
