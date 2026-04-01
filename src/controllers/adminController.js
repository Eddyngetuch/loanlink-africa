const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../utils/db');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const adminRes = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
  if (adminRes.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

  const admin = adminRes.rows[0];
  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
};

exports.getUsers = async (req, res) => {
  const users = await db.query('SELECT id, phone, national_id, registered_at FROM users ORDER BY id DESC');
  res.json(users.rows);
};

exports.getLoans = async (req, res) => {
  const loans = await db.query(`
    SELECT l.*, u.phone, u.national_id 
    FROM loans l 
    JOIN users u ON l.user_id = u.id 
    ORDER BY l.created_at DESC
  `);
  res.json(loans.rows);
};

exports.updateLoan = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['pending', 'fee_paid', 'disbursed', 'rejected', 'expired'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  await db.query('UPDATE loans SET status = $1 WHERE id = $2', [status, id]);
  res.json({ success: true });
};

exports.getPayments = async (req, res) => {
  const payments = await db.query(`
    SELECT p.*, u.phone, l.amount as loan_amount
    FROM payments p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN loans l ON p.loan_id = l.id
    ORDER BY p.created_at DESC
  `);
  res.json(payments.rows);
};