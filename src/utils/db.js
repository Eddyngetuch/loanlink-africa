const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../../loanlink.sqlite');

const db = new sqlite3.Database(dbPath);

// Initialize tables automatically
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    national_id TEXT NOT NULL,
    full_name TEXT,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    processing_fee INTEGER DEFAULT 99,
    fee_paid INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    loan_offer_expires_at DATETIME,
    disbursed_at DATETIME,
    due_date DATETIME,
    repaid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    b2c_conversation_id TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    loan_id INTEGER REFERENCES loans(id),
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    mpesa_receipt TEXT,
    merchant_request_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`INSERT OR IGNORE INTO admins (email, password_hash)
    VALUES ('admin@loanlink.co.ke', '$2b$10$8V5FwY2pI3xZq3O8L6wCZuMpQk7zNlP9uJkY2e5g6h7i8j9k0l1m2')`);
});

// Helper to run queries and return rows (for SELECT) or lastID (for INSERT/UPDATE)
module.exports = {
  query: (sql, params) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve({ rows });
    });
  }),
  run: (sql, params) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID });
    });
  }),
  db
};