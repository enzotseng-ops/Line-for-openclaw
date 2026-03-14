require('dotenv').config();

module.exports = {
  development: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './src/migrations',
    },
    seeds: {
      directory: './src/seeds',
    },
  },
  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './src/migrations',
    },
  },
};
