const express = require('express');
const { verifyAdmin } = require('../middleware/auth');
const { login, getUsers, getLoans, updateLoan, getPayments } = require('../controllers/adminController');

const router = express.Router();
router.post('/login', login);
router.get('/users', verifyAdmin, getUsers);
router.get('/loans', verifyAdmin, getLoans);
router.put('/loans/:id', verifyAdmin, updateLoan);
router.get('/payments', verifyAdmin, getPayments);

module.exports = router;