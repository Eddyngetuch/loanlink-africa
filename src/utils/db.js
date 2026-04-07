const { Pool } = require('pg');

console.log('DB: DATABASE_URL is', process.env.DATABASE_URL ? 'set (length ' + process.env.DATABASE_URL.length + ')' : 'NOT SET');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};