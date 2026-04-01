const cron = require('node-cron');
const pool = require('../config/db');
const { verifyPayment } = require('./fastlipa.service');
const { sendSms } = require('./smsGateway.service');

// Job 1: Reconcile pending payments (Runs every 15 minutes)
const checkPendingPayments = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT id, subscription_id, gateway_reference, transaction_id
       FROM billing_history
       WHERE status = 'pending'
         AND created_at < NOW() - INTERVAL '5 minutes'
         AND created_at > NOW() - INTERVAL '24 hours'`
    );

    for (const bill of rows) {
      if (!bill.gateway_reference && !bill.transaction_id) continue;

      // Use gateway_reference or transaction_id to verify
      const ref = bill.transaction_id || bill.gateway_reference;
      const result = await verifyPayment(ref);

      if (result.status === 'success' || result.status === 'failed') {
        const updateRes = await pool.query(
          `UPDATE billing_history
           SET status = $1, transaction_id = COALESCE($2, transaction_id), gateway_reference = COALESCE($3, gateway_reference)
           WHERE id = $4
           RETURNING *`,
          [result.status, result.transaction_id, result.gateway_reference, bill.id]
        );

        // If successful, activate subscription
        if (result.status === 'success' && bill.subscription_id) {
          await pool.query(
            `UPDATE subscriptions
             SET status = 'active', starts_at = NOW(), ends_at = NOW() + (CASE WHEN billing_cycle='yearly' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END)
             WHERE id = $1`,
            [bill.subscription_id]
          );

          await pool.query(
            `INSERT INTO user_subscriptions (user_id, plan_id, status, billing_cycle, started_at, expires_at, updated_at)
             SELECT s.user_id, s.plan_id, 'active', s.billing_cycle, NOW(), s.ends_at, NOW()
             FROM subscriptions s WHERE s.id=$1
             ON CONFLICT (user_id)
             DO UPDATE SET plan_id=EXCLUDED.plan_id, status='active', billing_cycle=EXCLUDED.billing_cycle, started_at=EXCLUDED.started_at, expires_at=EXCLUDED.expires_at, updated_at=NOW()`,
            [bill.subscription_id]
          );
        }
      }
    }
  } catch (error) {
    console.error('[cron] Pending payments error:', error.message);
  }
};

// Job 2: Send Expiry Reminders (Runs daily at 09:00 AM)
const sendExpiryReminders = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT us.user_id, us.expires_at, p.name AS plan_name, u.phone
       FROM user_subscriptions us
       JOIN users u ON us.user_id = u.id
       JOIN plans p ON us.plan_id = p.id
       WHERE us.status = 'active'
         AND us.expires_at >= CURRENT_DATE + INTERVAL '3 days'
         AND us.expires_at < CURRENT_DATE + INTERVAL '4 days'
         AND u.phone IS NOT NULL`
    );

    for (const sub of rows) {
      const message = `Taarifa: Mpango wako wa RentFlow (${sub.plan_name}) unaisha baada ya siku 3. Tafadhali lipia mapema kuepuka usumbufu kwenye akaunti yako. Ahsante.`;
      try {
         await sendSms({ phone: sub.phone, message });
      } catch (err) {
         console.error(`[cron] Failed to send reminder to ${sub.phone}: ${err.message}`);
      }
    }
  } catch (error) {
    console.error('[cron] Expiry reminders error:', error.message);
  }
};

const initCronJobs = () => {
  // Check pending payments every 15 minutes
  cron.schedule('*/15 * * * *', checkPendingPayments);
  
  // Check expiry reminders every day at 09:00 AM
  cron.schedule('0 9 * * *', sendExpiryReminders);

  console.log('[boot] Cron jobs initialised for automated reconciliation and reminders');
};

module.exports = {
  initCronJobs,
  checkPendingPayments,
  sendExpiryReminders,
};
