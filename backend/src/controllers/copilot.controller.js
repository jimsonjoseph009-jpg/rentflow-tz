const pool = require('../config/db');

const lower = (v) => String(v || '').toLowerCase();

exports.askCopilot = async (req, res) => {
  const userId = req.user.id;
  const query = String(req.body.query || '').trim();

  if (!query) {
    return res.status(400).json({ message: 'query is required' });
  }

  const q = lower(query);

  try {
    let intent = 'general';
    let result = {};
    let answer = 'I understood your request. Here is a summary.';

    if (q.includes('monthly revenue') || q.includes('mapato ya mwezi') || q.includes('revenue mwezi')) {
      intent = 'monthly_revenue';
      const { rows } = await pool.query(
        `SELECT COALESCE(SUM(pay.amount), 0) AS revenue
         FROM payments pay
         JOIN tenants t ON pay.tenant_id=t.id
         JOIN units u ON t.unit_id=u.id
         JOIN properties p ON u.property_id=p.id
         WHERE p.landlord_id=$1
           AND pay.status='success'
           AND EXTRACT(MONTH FROM COALESCE(pay.payment_date, pay.created_at)) = EXTRACT(MONTH FROM CURRENT_DATE)
           AND EXTRACT(YEAR FROM COALESCE(pay.payment_date, pay.created_at)) = EXTRACT(YEAR FROM CURRENT_DATE)`,
        [userId]
      );
      const value = Number(rows[0].revenue || 0);
      result = { monthly_revenue: value };
      answer = `Monthly revenue yako ni TZS ${value.toLocaleString()}.`;
    } else if (q.includes('failed payment') || q.includes('malipo yaliyofeli')) {
      intent = 'failed_payments';
      const { rows } = await pool.query(
        `SELECT pay.id, pay.amount, pay.created_at, t.full_name AS tenant_name
         FROM payments pay
         JOIN tenants t ON pay.tenant_id=t.id
         JOIN units u ON t.unit_id=u.id
         JOIN properties p ON u.property_id=p.id
         WHERE p.landlord_id=$1 AND pay.status='failed'
         ORDER BY pay.created_at DESC
         LIMIT 10`,
        [userId]
      );
      result = { failed_payments: rows };
      answer = `Nimepata malipo yaliyofeli ${rows.length} ya karibuni.`;
    } else if (q.includes('vacant') || q.includes('vacancy') || q.includes('units wazi')) {
      intent = 'vacancy';
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS vacant_units
         FROM units u
         JOIN properties p ON u.property_id=p.id
         WHERE p.landlord_id=$1 AND lower(u.status)='vacant'`,
        [userId]
      );
      const value = Number(rows[0].vacant_units || 0);
      result = { vacant_units: value };
      answer = `Una units ${value} ambazo ziko vacant kwa sasa.`;
    } else {
      intent = 'overview';
      const [properties, tenants, pendingPayments] = await Promise.all([
        pool.query('SELECT COUNT(*)::int AS value FROM properties WHERE landlord_id=$1', [userId]),
        pool.query(
          `SELECT COUNT(*)::int AS value
           FROM tenants t
           JOIN units u ON t.unit_id=u.id
           JOIN properties p ON u.property_id=p.id
           WHERE p.landlord_id=$1`,
          [userId]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS value
           FROM payments pay
           JOIN tenants t ON pay.tenant_id=t.id
           JOIN units u ON t.unit_id=u.id
           JOIN properties p ON u.property_id=p.id
           WHERE p.landlord_id=$1 AND pay.status='pending'`,
          [userId]
        ),
      ]);

      result = {
        total_properties: Number(properties.rows[0].value || 0),
        total_tenants: Number(tenants.rows[0].value || 0),
        pending_payments: Number(pendingPayments.rows[0].value || 0),
      };
      answer = `Overview: properties ${result.total_properties}, tenants ${result.total_tenants}, pending payments ${result.pending_payments}.`;
    }

    await pool.query(
      `INSERT INTO ai_usage_logs (user_id, feature_name, request_payload, response_payload, tokens_used)
       VALUES ($1,'copilot_assistant',$2,$3,$4)`,
      [userId, JSON.stringify({ query, intent }), JSON.stringify({ answer, result }), 180]
    );

    return res.json({ intent, answer, result });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Copilot failed to process request' });
  }
};
