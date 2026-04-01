const db = require('../utils/db');
const { disburseLoan } = require('../services/mpesa');

// STK push callback
exports.handleStkCallback = async (req, res) => {
  const { Body: { stkCallback } } = req.body;
  const { MerchantRequestID, ResultCode, CallbackMetadata } = stkCallback;

  if (ResultCode === 0) {
    const items = CallbackMetadata.Item;
    const mpesaReceipt = items.find(i => i.Name === 'MpesaReceiptNumber').Value;
    const amount = items.find(i => i.Name === 'Amount').Value;
    const phone = items.find(i => i.Name === 'PhoneNumber').Value;

    // Find the pending payment record
    const paymentRes = await db.query(
      `SELECT * FROM payments WHERE merchant_request_id = $1 AND status = 'pending'`,
      [MerchantRequestID]
    );
    if (paymentRes.rows.length === 0) {
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
    const payment = paymentRes.rows[0];

    // Update payment status
    await db.query(
      `UPDATE payments SET status = 'completed', mpesa_receipt = $1 WHERE id = $2`,
      [mpesaReceipt, payment.id]
    );

    // Update loan: mark fee as paid and status as 'fee_paid'
    const loanRes = await db.query(
      `UPDATE loans SET fee_paid = true, status = 'fee_paid' WHERE id = $1 RETURNING *`,
      [payment.loan_id]
    );
    const loan = loanRes.rows[0];

    // Initiate B2C disbursement
    const result = await disburseLoan(loan.id, phone, loan.amount);
    if (result.success) {
      // Store the B2C conversation ID for later callback matching
      await db.query(
        `UPDATE loans SET b2c_conversation_id = $1 WHERE id = $2`,
        [result.conversationId, loan.id]
      );
      // Optionally, we don't set status to 'disbursed' yet – we'll wait for the B2C result callback.
    } else {
      console.error('B2C initiation failed:', result.error);
    }
  } else {
    // Payment failed
    await db.query(
      `UPDATE payments SET status = 'failed' WHERE merchant_request_id = $1`,
      [MerchantRequestID]
    );
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
};

// B2C result callback (from Safaricom)
exports.b2cResult = async (req, res) => {
  console.log('B2C result:', req.body);
  const { ResultCode, ConversationID, TransactionID } = req.body;

  if (ResultCode === 0) {
    // Success – update loan to disbursed
    await db.query(
      `UPDATE loans SET status = 'disbursed', disbursed_at = NOW(), due_date = NOW() + INTERVAL '6 months' WHERE b2c_conversation_id = $1`,
      [ConversationID]
    );
  } else {
    // Failure – mark as failed (admin can retry later)
    await db.query(
      `UPDATE loans SET status = 'disbursement_failed' WHERE b2c_conversation_id = $1`,
      [ConversationID]
    );
  }

  res.json({ ResultCode: 0, ResultDesc: 'Success' });
};

// B2C timeout callback (if the request times out)
exports.b2cTimeout = async (req, res) => {
  console.log('B2C timeout:', req.body);
  const { ConversationID } = req.body;
  await db.query(
    `UPDATE loans SET status = 'disbursement_failed' WHERE b2c_conversation_id = $1`,
    [ConversationID]
  );
  res.json({ ResultCode: 0, ResultDesc: 'Success' });
};