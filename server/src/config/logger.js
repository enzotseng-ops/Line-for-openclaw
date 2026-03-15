const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

/**
 * Log an error with rich context: message, stack, HTTP status, response body.
 * Usage: logError('LLM error', err)
 */
function logError(context, err) {
  const meta = {
    stack: err.stack,
    statusCode: err.statusCode || err.status || err.response?.status,
    responseBody: err.response?.data || err.response?.body,
  };
  logger.error(`${context}: ${err.message}`, meta);
}

logger.logError = logError;

module.exports = logger;
