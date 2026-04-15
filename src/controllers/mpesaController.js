const db = require('../utils/db');
const { disburseLoan } = require('../services/mpesa');

exports.handleStkCallback = async (req, res) => {
  // This is called by Safaricom after STK push – we use simulation so it's optional
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
};

exports.b2cResult = async (req, res) => {
  console.log('B2C result:', req.body);
  res.json({ ResultCode: 0, ResultDesc: 'Success' });
};

exports.b2cTimeout = async (req, res) => {
  console.log('B2C timeout:', req.body);
  res.json({ ResultCode: 0, ResultDesc: 'Success' });
};