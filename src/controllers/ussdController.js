const db = require('../utils/db');
const redis = require('../utils/redis');
const { initiateSTKPush } = require('../services/mpesa');

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
        response = formatResponse('Welcome to LoanLink Africa.\nPlease enter your National ID number:');
        newState = 'GET_ID';
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
        response = formatResponse(
          'Select your preferred loan range:\n1. Ksh 0 - 49,999\n2. Ksh 50,000 - 99,000\n3. Ksh 100,000 - 120,000'
        );
        newState = 'SELECT_RANGE';
        break;

      case 'SELECT_RANGE':
        let amount;
        switch (userInput) {
          case '1': amount = 25000; break;
          case '2': amount = 75000; break;
          case '3': amount = 110000; break;
          default:
            response = formatResponse('Invalid choice. Select 1, 2, or 3:');
            newState = 'SELECT_RANGE';
            break;
        }
        if (amount) {
          await redis.set(`ussd:temp:${sessionId}:amount`, amount);
          response = formatResponse(
            `You qualify for a loan of Ksh ${amount.toLocaleString()}. Repay in 6 months.\nA processing fee of Ksh 99 is required.\n1. Pay now\n2. Cancel`
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
            response = formatResponse(
              `CONFIRMED! Congratulations, your loan of Ksh ${amount.toLocaleString()} has been approved.\nYou will receive an M-Pesa prompt to pay the Ksh 99 processing fee.\nAfter payment, the loan will be sent to your M-Pesa.\nOffer expires in 24 hours.`,
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