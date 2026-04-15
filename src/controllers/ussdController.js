const db = require('../utils/db');
const redis = require('../utils/redis');
const { initiateSTKPush, disburseLoan } = require('../services/mpesa');

const formatResponse = (message, isEnd = false) => {
  return isEnd ? `END ${message}` : `CON ${message}`;
};

exports.handleUssd = async (req, res) => {
  const { sessionId, phoneNumber, text } = req.body;
  const userInput = text.split('*').pop();
  let state = await redis.get(`ussd:session:${sessionId}`) || 'INIT';

  let response = '';
  let newState = state;

  try {
    switch (state) {
      case 'INIT':
        response = formatResponse('Welcome to LoanLink Africa – instant loans up to KES 50,000.\n1. Apply for loan\n2. Check status\n3. Repay loan');
        newState = 'MAIN_MENU';
        break;

      case 'MAIN_MENU':
        if (userInput === '1') {
          response = formatResponse('Enter your National ID number (8 digits):');
          newState = 'GET_ID';
        } else if (userInput === '2') {
          const user = await db.query('SELECT id FROM users WHERE phone = $1', [phoneNumber]);
          if (user.rows.length === 0) {
            response = formatResponse('You are not registered. Please apply for a loan first.', true);
            newState = 'END';
          } else {
            const loan = await db.query(
              `SELECT status, amount FROM loans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
              [user.rows[0].id]
            );
            if (loan.rows.length === 0) {
              response = formatResponse('You have no loan applications.', true);
            } else {
              response = formatResponse(`Your last loan: KES ${loan.rows[0].amount}, status: ${loan.rows[0].status}`, true);
            }
            newState = 'END';
          }
        } else if (userInput === '3') {
          const user = await db.query('SELECT id FROM users WHERE phone = $1', [phoneNumber]);
          if (user.rows.length === 0) {
            response = formatResponse('You are not registered. Please apply for a loan first.', true);
            newState = 'END';
          } else {
            const loan = await db.query(
              `SELECT id, amount FROM loans 
               WHERE user_id = $1 AND status = 'disbursed' AND repaid_at IS NULL 
               ORDER BY created_at DESC LIMIT 1`,
              [user.rows[0].id]
            );
            if (loan.rows.length === 0) {
              response = formatResponse('You have no active loan to repay.', true);
              newState = 'END';
            } else {
              await redis.set(`ussd:temp:${sessionId}:repay_loan_id`, loan.rows[0].id);
              await redis.set(`ussd:temp:${sessionId}:repay_amount`, loan.rows[0].amount);
              response = formatResponse(`Your outstanding loan is KES ${loan.rows[0].amount}. Repay now?\n1. Yes\n2. No`);
              newState = 'REPAY_CONFIRM';
            }
          }
        } else {
          response = formatResponse('Invalid option. Choose 1, 2, or 3.');
          newState = 'MAIN_MENU';
        }
        break;

      case 'GET_ID':
        const nationalId = userInput;
        if (!/^\d{8}$/.test(nationalId)) {
          response = formatResponse('Invalid ID. Please enter 8 digits:');
          newState = 'GET_ID';
          break;
        }
        await redis.set(`ussd:temp:${sessionId}:nationalId`, nationalId);
        const userCheck = await db.query('SELECT id FROM users WHERE phone = $1', [phoneNumber]);
        if (userCheck.rows.length === 0) {
          await db.query('INSERT INTO users (phone, national_id) VALUES ($1, $2)', [phoneNumber, nationalId]);
        } else {
          await db.query('UPDATE users SET national_id = $1 WHERE phone = $2', [nationalId, phoneNumber]);
        }
        response = formatResponse('Select loan amount:\n1. KES 5,000\n2. KES 10,000\n3. KES 20,000\n4. KES 50,000');
        newState = 'SELECT_RANGE';
        break;

      case 'SELECT_RANGE':
        let amount;
        switch (userInput) {
          case '1': amount = 5000; break;
          case '2': amount = 10000; break;
          case '3': amount = 20000; break;
          case '4': amount = 50000; break;
          default:
            response = formatResponse('Invalid choice. Select 1, 2, 3, or 4:');
            newState = 'SELECT_RANGE';
            break;
        }
        if (amount) {
          await redis.set(`ussd:temp:${sessionId}:amount`, amount);
          response = formatResponse(
            `You qualify for KES ${amount.toLocaleString()}. Repay in 30 days.\nProcessing fee KES 99 applies.\n1. Accept and pay fee\n2. Cancel`
          );
          newState = 'CONFIRM_FEE';
        }
        break;

      case 'CONFIRM_FEE':
        if (userInput === '1') {
          const amount = parseInt(await redis.get(`ussd:temp:${sessionId}:amount`));
          const nationalId = await redis.get(`ussd:temp:${sessionId}:nationalId`);
          const userRes = await db.query('SELECT id FROM users WHERE phone = $1', [phoneNumber]);
          const userId = userRes.rows[0].id;

          const loanRes = await db.query(
            `INSERT INTO loans (user_id, amount, loan_offer_expires_at) 
             VALUES ($1, $2, NOW() + INTERVAL '24 hours') RETURNING id`,
            [userId, amount]
          );
          const loanId = loanRes.rows[0].id;

          const paymentResult = await initiateSTKPush(phoneNumber, 99, loanId, sessionId);
          if (paymentResult && paymentResult.MerchantRequestID) {
            await db.query(
              `INSERT INTO payments (user_id, loan_id, amount, type, merchant_request_id, status)
               VALUES ($1, $2, $3, 'processing_fee', $4, 'pending')`,
              [userId, loanId, 99, paymentResult.MerchantRequestID]
            );

            // Simulate payment success
            await db.query(
              `UPDATE payments SET status = 'completed', mpesa_receipt = $1 WHERE merchant_request_id = $2`,
              [`SIM_RECEIPT_${Date.now()}`, paymentResult.MerchantRequestID]
            );
            await db.query(
              `UPDATE loans SET fee_paid = true, status = 'fee_paid' WHERE id = $1`,
              [loanId]
            );
            const disbursement = await disburseLoan(loanId, phoneNumber, amount);
            if (disbursement.success) {
              await db.query(
                `UPDATE loans SET status = 'disbursed', disbursed_at = NOW(), due_date = NOW() + INTERVAL '30 days', b2c_conversation_id = $1 WHERE id = $2`,
                [disbursement.conversationId, loanId]
              );
            } else {
              await db.query(`UPDATE loans SET status = 'disbursement_failed' WHERE id = $1`, [loanId]);
            }

            response = formatResponse(
              `CONFIRMED! Your loan of KES ${amount.toLocaleString()} has been sent to your M‑Pesa.\nRepay in 30 days.`,
              true
            );
          } else {
            response = formatResponse('Payment initiation failed. Please try again later.', true);
          }
        } else {
          response = formatResponse('Transaction cancelled. Thank you for using LoanLink Africa.', true);
        }
        newState = 'END';
        break;

      case 'REPAY_CONFIRM':
        if (userInput === '1') {
          const loanId = await redis.get(`ussd:temp:${sessionId}:repay_loan_id`);
          await db.query(
            `UPDATE loans SET status = 'repaid', repaid_at = NOW() WHERE id = $1`,
            [loanId]
          );
          response = formatResponse('Repayment successful. Thank you for trusting LoanLink Africa.', true);
        } else {
          response = formatResponse('Repayment cancelled.', true);
        }
        newState = 'END';
        break;

      default:
        response = formatResponse('Session expired. Please dial again.', true);
        newState = 'END';
    }

    if (newState !== 'END') {
      await redis.set(`ussd:session:${sessionId}`, newState, { EX: 300 });
    } else {
      await redis.del(`ussd:session:${sessionId}`);
    }

    res.send(response);
  } catch (error) {
    console.error('USSD error:', error);
    res.send(formatResponse('An error occurred. Please try again.', true));
  }
};