/**
 * Setup Mode guard — blocks non-essential API routes when DB is not configured.
 * Static files (React SPA) are served before this middleware, so they always work.
 */
function setupGuard(req, res, next) {
  if (process.env.SETUP_MODE !== 'true') return next();

  // Always allow these paths during setup
  const allowed = ['/api/setup', '/api/auth', '/health'];
  if (allowed.some((prefix) => req.path.startsWith(prefix))) return next();

  res.status(503).json({
    error: 'System is in setup mode',
    setupRequired: true,
    message: 'Please complete the setup wizard at /setup',
  });
}

module.exports = setupGuard;
