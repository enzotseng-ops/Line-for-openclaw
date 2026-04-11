const knex = require('knex');
require('dotenv').config();

let instance = null;

function createInstance(connectionUrl) {
  if (instance) {
    instance.destroy().catch(() => {});
  }
  instance = knex({
    client: 'postgresql',
    connection: connectionUrl,
    pool: { min: 2, max: 10 },
  });
  return instance;
}

// Auto-initialize if DATABASE_URL is already set (existing deployments)
if (process.env.DATABASE_URL) {
  createInstance(process.env.DATABASE_URL);
}

/**
 * Knex wrapper — delegates to the current instance.
 * Supports hot-reinitialization via db.reinitialize(url).
 */
function db(...args) {
  if (!instance) throw new Error('Database not configured');
  return instance(...args);
}

// Proxy common knex properties so db.raw(), db.schema, db.migrate, etc. work
['raw', 'schema', 'migrate', 'destroy', 'transaction', 'ref', 'client'].forEach((prop) => {
  Object.defineProperty(db, prop, {
    get() {
      if (!instance) throw new Error('Database not configured');
      return typeof instance[prop] === 'function'
        ? instance[prop].bind(instance)
        : instance[prop];
    },
  });
});

db.isConfigured = () => !!instance;
db.reinitialize = createInstance;

module.exports = db;
