require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests'
});
app.use('/api/', limiter);

app.get('/', (req, res) => {
  res.json({ status: 'LoanLink Africa API is running' });
});

// Routes
const ussdRoutes = require('./src/routes/ussd');
const mpesaRoutes = require('./src/routes/mpesa');
const adminRoutes = require('./src/routes/admin');
app.use('/ussd', ussdRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/admin', adminRoutes);

// Temporary migration endpoint (remove after use)
const migrate = require('./src/utils/migrate');
app.get('/admin/migrate', async (req, res) => {
  try {
    await migrate();
    res.send('Migration completed');
  } catch (err) {
    res.status(500).send('Migration failed: ' + err.message);
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});