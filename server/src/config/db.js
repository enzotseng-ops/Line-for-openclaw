const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'postgresql',
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 },
});

module.exports = db;
