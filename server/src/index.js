require('dotenv').config();
require('./config/ensureEnv')();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const { loginLimiter, registerLimiter } = require('./middleware/loginRateLimit');

// Ensure upload directories exist
fs.mkdirSync(path.join(__dirname, '../uploads/knowledge'), { recursive: true });

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Zeabur, Cloudflare, etc.)

// Serve React frontend (built files from client/dist) — before CORS so static assets are never blocked
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,  // React SPA manages its own CSP
}));
app.use(cors());

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

// Setup mode guard — blocks non-setup routes when DB not configured
app.use(require('./middleware/setupGuard'));

// Rate limiting for auth endpoints
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);

// Routes
app.use('/api/setup', require('./routes/setup.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/webhook', require('./routes/webhook.routes'));
app.use('/api/line-users', require('./routes/lineUsers.routes'));
app.use('/api/messages', require('./routes/messages.routes'));
app.use('/api/schedules', require('./routes/schedules.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/files', require('./routes/files.routes'));
app.use('/api/mcp', require('./routes/mcp.routes'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// SPA fallback: all non-API routes serve index.html
if (fs.existsSync(clientDist)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);

  // Auto-run migrations on startup when DB is configured
  if (process.env.DATABASE_URL) {
    try {
      const db = require('./config/db');
      await db.migrate.latest({ directory: path.join(__dirname, 'migrations') });
      logger.info('Database migrations up to date');
    } catch (err) {
      logger.error(`Migration failed: ${err.message}`);
    }
  }
});

module.exports = app;
