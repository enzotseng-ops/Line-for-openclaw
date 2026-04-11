const express = require('express');
const router = express.Router();
const { status, initialize, configureDatabase } = require('../controllers/setup.controller');
const auth = require('../middleware/auth');

// No auth — must be accessible before first login
router.get('/status', status);
router.post('/database', configureDatabase);

// Requires auth — only logged-in admin can initialize
router.post('/initialize', auth, initialize);

module.exports = router;
