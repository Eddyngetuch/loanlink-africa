const cron = require('node-cron');
const db = require('../utils/db');

// Expire pending loans after 24 hours (runs every hour)
cron.schedule('0 * * * *', async () => {
  try {
    const result = await db.query(
      `UPDATE loans SET status = 'expired' 
       WHERE status = 'pending' AND loan_offer_expires_at < NOW()`
    );
    if (result.rowCount > 0) {
      console.log(`[CRON] Expired ${result.rowCount} loan offers`);
    }
  } catch (error) {
    console.error('[CRON] Error expiring loans:', error);
  }
});

// Send repayment reminders 7 days before due date (runs daily at 9am)
cron.schedule('0 9 * * *', async () => {
  try {
    const loansDue = await db.query(
      `SELECT l.*, u.phone FROM loans l 
       JOIN users u ON l.user_id = u.id 
       WHERE l.status = 'disbursed' 
         AND l.due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'`
    );
    for (const loan of loansDue.rows) {
      // TODO: Replace with actual SMS via Africa's Talking
      console.log(`[CRON] Reminder: Loan ${loan.id} of KES ${loan.amount} due on ${loan.due_date} for ${loan.phone}`);
    }
  } catch (error) {
    console.error('[CRON] Error sending reminders:', error);
  }
});

console.log('[CRON] Cron jobs started');
