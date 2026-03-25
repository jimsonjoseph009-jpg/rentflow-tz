const pool = require('../config/db');

exports.getAdminMonetizationDashboard = async (_req, res) => {
  try {
    const [subscriptionRevenue, transactionFees, smsRevenue, activeSubs, activeUsers, enterpriseClients] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(amount),0) AS value FROM billing_history WHERE billing_type='subscription' AND status='success'`),
      pool.query(`SELECT COALESCE(SUM(fee_amount),0) AS value FROM transaction_fees WHERE status='success'`),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS value FROM sms_billing WHERE status='success'`),
      pool.query(`SELECT COUNT(*) AS value FROM user_subscriptions WHERE status='active'`),
      pool.query(`SELECT COUNT(*) AS value FROM users`),
      pool.query(`SELECT COUNT(*) AS value FROM enterprise_clients WHERE status='active'`),
    ]);

    res.json({
      total_revenue:
        Number(subscriptionRevenue.rows[0].value || 0) +
        Number(transactionFees.rows[0].value || 0) +
        Number(smsRevenue.rows[0].value || 0),
      subscription_revenue: Number(subscriptionRevenue.rows[0].value || 0),
      transaction_fees_collected: Number(transactionFees.rows[0].value || 0),
      sms_revenue: Number(smsRevenue.rows[0].value || 0),
      active_subscriptions: Number(activeSubs.rows[0].value || 0),
      active_users: Number(activeUsers.rows[0].value || 0),
      enterprise_clients: Number(enterpriseClients.rows[0].value || 0),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to fetch admin monetization dashboard' });
  }
};
