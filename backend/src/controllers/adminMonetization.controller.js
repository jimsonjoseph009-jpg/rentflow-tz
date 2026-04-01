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

exports.getMonetizationDetails = async (req, res) => {
  const { type } = req.params;
  try {
    let result;
    switch (type) {
      case 'active_subscriptions':
        result = await pool.query(`
          SELECT us.*, u.name, u.email 
          FROM user_subscriptions us 
          JOIN users u ON u.id = us.user_id 
          WHERE us.status='active' 
          ORDER BY us.updated_at DESC
        `);
        break;
      case 'active_users':
        result = await pool.query(`
          SELECT id, name, email, role, created_at 
          FROM users 
          ORDER BY created_at DESC
        `);
        break;
      case 'subscription_revenue':
        result = await pool.query(`
          SELECT bh.*, u.name, u.email 
          FROM billing_history bh 
          JOIN users u ON u.id = bh.user_id 
          WHERE bh.billing_type='subscription' AND bh.status='success' 
          ORDER BY bh.created_at DESC
        `);
        break;
      case 'transaction_fees_collected':
        result = await pool.query(`
          SELECT t.*, u.name AS user_name, u.email AS user_email
          FROM transaction_fees t
          LEFT JOIN users u ON u.id = t.user_id
          WHERE t.status='success'
          ORDER BY t.created_at DESC
        `);
        break;
      case 'sms_revenue':
        result = await pool.query(`
          SELECT s.*, u.name, u.email 
          FROM sms_billing s 
          JOIN users u ON u.id = s.user_id 
          WHERE s.status='success' 
          ORDER BY s.created_at DESC
        `);
        break;
      case 'total_revenue':
        result = await pool.query(`
          (SELECT id, amount, 'subscription' as source, created_at, user_id FROM billing_history WHERE billing_type='subscription' AND status='success')
          UNION ALL
          (SELECT id, fee_amount as amount, 'transaction_fee' as source, created_at, user_id FROM transaction_fees WHERE status='success')
          UNION ALL
          (SELECT id, amount, 'sms' as source, created_at, user_id FROM sms_billing WHERE status='success')
          ORDER BY created_at DESC
          LIMIT 100
        `);
        break;
      case 'enterprise_clients':
        result = await pool.query(`
          SELECT * FROM enterprise_clients WHERE status='active' ORDER BY created_at DESC
        `);
        break;
      default:
        return res.status(400).json({ message: 'Invalid detail type' });
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to fetch details' });
  }
};
