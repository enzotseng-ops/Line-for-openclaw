require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');

// Ensure upload directories exist
fs.mkdirSync(path.join(__dirname, '../uploads/knowledge'), { recursive: true });

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,  // React SPA manages its own CSP
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin (curl, Postman) and common dev ports
    const allowed = [
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'https://line-bot.openclaw-gb.com',
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
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

// Serve React frontend (built files from client/dist)
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: all non-API routes serve index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;
