const pool = require('../config/db');

exports.getPaymentMethods = async (req, res) => {
  let landlordId = req.query.landlord_id;
  
  if (req.user.role === 'landlord') {
    landlordId = req.user.id;
  } else if (req.user.role === 'tenant') {
    const tenantRes = await pool.query(
      `SELECT p.landlord_id FROM tenants t
       JOIN units u ON t.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       WHERE t.user_id=$1 LIMIT 1`, 
       [req.user.id]
    );
    if (tenantRes.rows.length) {
      landlordId = tenantRes.rows[0].landlord_id;
    }
  }

  if (!landlordId) return res.status(400).json({ message: 'landlord_id required or landlord not found' });

  try {
    const result = await pool.query(
      `SELECT * FROM landlord_payment_methods WHERE landlord_id=$1 ORDER BY is_default DESC, created_at DESC`,
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addPaymentMethod = async (req, res) => {
  const landlordId = req.user.id;
  const { provider_name, account_name, account_number, instructions, is_default } = req.body;

  try {
    if (is_default) {
      await pool.query(`UPDATE landlord_payment_methods SET is_default=false WHERE landlord_id=$1`, [landlordId]);
    }

    const result = await pool.query(
      `INSERT INTO landlord_payment_methods (landlord_id, provider_name, account_name, account_number, instructions, is_default)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [landlordId, provider_name, account_name, account_number, instructions, is_default || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deletePaymentMethod = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    await pool.query(`DELETE FROM landlord_payment_methods WHERE id=$1 AND landlord_id=$2`, [id, landlordId]);
    res.json({ message: 'Payment method deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
