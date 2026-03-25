const pool = require('../config/db');

exports.getBillingHistory = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT bh.*, p.name AS plan_name
       FROM billing_history bh
       LEFT JOIN subscriptions s ON bh.subscription_id=s.id
       LEFT JOIN plans p ON s.plan_id=p.id
       WHERE bh.user_id=$1
       ORDER BY bh.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to fetch billing history' });
  }
};

exports.getTransactionFees = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT tf.*
       FROM transaction_fees tf
       WHERE tf.user_id=$1
       ORDER BY tf.created_at DESC`,
      [req.user.id]
    );

    const summary = rows.reduce(
      (acc, row) => {
        acc.total_fees += Number(row.fee_amount || 0);
        acc.total_transactions += 1;
        return acc;
      },
      { total_fees: 0, total_transactions: 0 }
    );

    res.json({ summary, items: rows });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to fetch transaction fees' });
  }
};

exports.getSmsUsage = async (req, res) => {
  try {
    const [usageRes, logsRes] = await Promise.all([
      pool.query('SELECT * FROM sms_usage WHERE user_id=$1 ORDER BY period_month DESC', [req.user.id]),
      pool.query('SELECT * FROM sms_logs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [req.user.id]),
    ]);

    res.json({ usage: usageRes.rows, logs: logsRes.rows });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to fetch SMS usage' });
  }
};
