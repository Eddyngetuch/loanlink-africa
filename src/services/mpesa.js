const axios = require('axios'); // kept for compatibility, not used

async function getAccessToken() {
  return 'simulated_token';
}

async function initiateSTKPush(phone, amount, loanId, sessionId) {
  console.log(`[SIMULATION] STK push to ${phone} for KES ${amount} (loan ${loanId})`);
  return { MerchantRequestID: `SIM_${Date.now()}` };
}

async function disburseLoan(loanId, phone, amount) {
  console.log(`[SIMULATION] Disbursing KES ${amount} to ${phone} (loan ${loanId})`);
  return { success: true, conversationId: `SIM_CONV_${Date.now()}` };
}

module.exports = { getAccessToken, initiateSTKPush, disburseLoan };
