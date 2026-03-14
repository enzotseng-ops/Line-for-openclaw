require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security headers
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing (webhook route handles its own raw body)
app.use((req, res, next) => {
  if (req.path === '/api/webhook/line') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Static files for media uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/webhook', require('./routes/webhook.routes'));
app.use('/api/line-users', require('./routes/lineUsers.routes'));
app.use('/api/messages', require('./routes/messages.routes'));
app.use('/api/schedules', require('./routes/schedules.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/files', require('./routes/files.routes'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;
