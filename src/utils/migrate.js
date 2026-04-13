const db = require('./db');

async function migrate() {
  try {
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(15) UNIQUE NOT NULL,
        national_id VARCHAR(20) NOT NULL,
        full_name VARCHAR(100),
        registered_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create loans table
    await db.query(`
      CREATE TABLE IF NOT EXISTS loans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        processing_fee INTEGER DEFAULT 99,
        fee_paid BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'pending',
        loan_offer_expires_at TIMESTAMP,
        disbursed_at TIMESTAMP,
        due_date TIMESTAMP,
        repaid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        b2c_conversation_id VARCHAR(100)
      );
    `);

    // Create payments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        loan_id INTEGER REFERENCES loans(id),
        amount INTEGER NOT NULL,
        type VARCHAR(20) NOT NULL,
        mpesa_receipt VARCHAR(50),
        merchant_request_id VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create admins table
    await db.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Insert admin user if not exists
    await db.query(`
      INSERT INTO admins (email, password_hash)
      VALUES ('admin@loanlink.co.ke', '\$2b\$10\$8V5FwY2pI3xZq3O8L6wCZuMpQk7zNlP9uJkY2e5g6h7i8j9k0l1m2')
      ON CONFLICT (email) DO NOTHING;
    `);

    console.log('? Database migration completed');
  } catch (error) {
    console.error('? Migration failed:', error);
    throw error;
  }
}

module.exports = migrate;
