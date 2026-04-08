require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com', 'https://admin.yourdomain.com']
    : '*',
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'LoanLink Africa API is running' });
});

// Temporary database setup endpoint – remove after tables are created
app.get('/setup', async (req, res) => {
  const { Client } = require('pg');
  const client = new Client({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
  });
  try {
    await client.connect();
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(15) UNIQUE NOT NULL,
        national_id VARCHAR(20) NOT NULL,
        full_name VARCHAR(100),
        registered_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
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
    await client.query(`
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      INSERT INTO admins (email, password_hash)
      VALUES ('admin@loanlink.co.ke', '$2b$10$8V5FwY2pI3xZq3O8L6wCZuMpQk7zNlP9uJkY2e5g6h7i8j9k0l1m2')
      ON CONFLICT (email) DO NOTHING;
    `);
    
    await client.end();
    res.send('✅ Database setup complete');
  } catch (err) {
    console.error(err);
    res.status(500).send('Setup failed: ' + err.message);
  }
});

// Routes
const ussdRoutes = require('./src/routes/ussd');
const mpesaRoutes = require('./src/routes/mpesa');
const adminRoutes = require('./src/routes/admin');
app.use('/ussd', ussdRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/admin', adminRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});