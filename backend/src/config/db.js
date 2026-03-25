const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'rentflow_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'rentflow',
  password: process.env.DB_PASSWORD || 'StrongPassword123',
  port: Number(process.env.DB_PORT || 5432),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
