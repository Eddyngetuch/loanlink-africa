const axios = require('axios');

let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  const auth = Buffer.from(`${process.env.DARAJAKI_CONSUMER_KEY}:${process.env.DARAJAKI_CONSUMER_SECRET}`).toString('base64');
  const url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
  const resp = await axios.get(url, {
    headers: { Authorization: `Basic ${auth}` }
  });
  accessToken = resp.data.access_token;
  tokenExpiry = Date.now() + 3500 * 1000;
  return accessToken;
}

async function initiateSTKPush(phone, amount, loanId, sessionId) {
  const token = await getAccessToken();
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  const password = Buffer.from(`${process.env.DARAJAKI_BUSINESS_SHORTCODE}${process.env.DARAJAKI_PASSKEY}${timestamp}`).toString('base64');

  const payload = {
    BusinessShortCode: process.env.DARAJAKI_BUSINESS_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: phone,
    PartyB: process.env.DARAJAKI_BUSINESS_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: `${process.env.DARAJAKI_CALLBACK_BASE_URL}/api/mpesa/callback`,
    AccountReference: `LoanLink-${loanId}`,
    TransactionDesc: `Processing fee for loan ${loanId}`
  };

  try {
    const resp = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return resp.data;
  } catch (error) {
    console.error('STK push error:', error.response?.data || error.message);
    return null;
  }
}

// For sandbox, we can just return the plain password. For production, you must encrypt.
function generateSecurityCredential(password) {
  return password;
}

async function disburseLoan(loanId, phone, amount) {
  const token = await getAccessToken();
  const securityCredential = generateSecurityCredential(process.env.DARAJAKI_B2C_PASSWORD);

  const payload = {
    InitiatorName: process.env.DARAJAKI_B2C_INITIATOR,
    SecurityCredential: securityCredential,
    CommandID: 'BusinessPayment',
    Amount: amount,
    PartyA: process.env.DARAJAKI_BUSINESS_SHORTCODE,
    PartyB: phone,
    Remarks: `Loan ${loanId} disbursement`,
    QueueTimeOutURL: `${process.env.DARAJAKI_CALLBACK_BASE_URL}/api/mpesa/b2c/timeout`,
    ResultURL: `${process.env.DARAJAKI_CALLBACK_BASE_URL}/api/mpesa/b2c/result`,
    Occasion: `LoanLink-${loanId}`
  };

  try {
    const resp = await axios.post('https://sandbox.safaricom.co.ke/mpesa/b2c/v3/paymentrequest', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const conversationId = resp.data.ConversationID;
    return { success: true, conversationId };
  } catch (error) {
    console.error('B2C error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data };
  }
}

module.exports = { getAccessToken, initiateSTKPush, disburseLoan };