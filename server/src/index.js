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

// Serve React frontend (built files from client/dist) — before CORS so static assets are never blocked
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,  // React SPA manages its own CSP
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin (curl, Postman, same-origin)
    if (!origin) return callback(null, true);

    // Exact matches: env-configured origins + common dev ports
    const allowed = [
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ].filter(Boolean);
    if (allowed.includes(origin)) return callback(null, true);

    // Wildcard subdomain patterns from CORS_ALLOWED_ORIGINS env
    // e.g. CORS_ALLOWED_ORIGINS=*.openclaw-gb.com,*.example.com
    const patterns = (process.env.CORS_ALLOWED_ORIGINS || '*.openclaw-gb.com')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    try {
      const originHostname = new URL(origin).hostname;
      const matched = patterns.some((pattern) => {
        if (pattern.startsWith('*.')) {
          const suffix = pattern.slice(1); // ".openclaw-gb.com"
          return originHostname.endsWith(suffix) || originHostname === suffix.slice(1);
        }
        return originHostname === pattern;
      });
      if (matched) return callback(null, true);
    } catch {
      // invalid origin URL
    }

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
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;
