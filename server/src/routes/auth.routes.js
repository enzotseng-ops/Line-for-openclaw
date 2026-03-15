const express = require('express');
const router = express.Router();
const { register, login, me, changePassword } = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, me);
router.put('/password', auth, changePassword);

module.exports = router;
