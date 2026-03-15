const express = require('express');
const router = express.Router();
const { status, initialize } = require('../controllers/setup.controller');
const auth = require('../middleware/auth');

// No auth — must be accessible before first login
router.get('/status', status);

// Requires auth — only logged-in admin can initialize
router.post('/initialize', auth, initialize);

module.exports = router;
