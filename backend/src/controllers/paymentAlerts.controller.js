const pool = require('../config/db');
const { ensureTenantOwnedByLandlord } = require('../services/ownership.service');
const toBool = (value, fallback = true) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
};

exports.createPaymentAlert = async (req, res) => {
  const landlordId = req.user.id;
  const tenantId = req.body.tenantId ?? req.body.tenant_id;
  const dueDate = req.body.dueDate ?? req.body.due_date;
  const amount = req.body.amount;
  const frequency = req.body.frequency;
  const isEnabledRaw = req.body.isEnabled ?? req.body.alert_enabled;
  const isEnabled = toBool(isEnabledRaw, true);

  try {
    const owned = await ensureTenantOwnedByLandlord(landlordId, tenantId);
    if (!owned.ok) return res.status(owned.status).json({ message: owned.message });

    const result = await pool.query(
      'INSERT INTO payment_alerts (landlord_id, tenant_id, due_date, amount, frequency, is_enabled, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *',
      [landlordId, owned.tenantId, dueDate, amount, frequency, isEnabled]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPaymentAlerts = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT pa.*,
              pa.is_enabled AS alert_enabled,
              t.full_name AS tenant_name
       FROM payment_alerts pa
       LEFT JOIN tenants t ON pa.tenant_id = t.id
       WHERE pa.landlord_id=$1
       ORDER BY pa.due_date ASC`,
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPaymentAlertById = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM payment_alerts WHERE id=$1 AND landlord_id=$2',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Alert not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePaymentAlert = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const tenantId = req.body.tenantId ?? req.body.tenant_id;
  const dueDate = req.body.dueDate ?? req.body.due_date;
  const amount = req.body.amount;
  const frequency = req.body.frequency;
  const isEnabled = toBool(req.body.isEnabled ?? req.body.alert_enabled, true);

  try {
    const owned = await ensureTenantOwnedByLandlord(landlordId, tenantId);
    if (!owned.ok) return res.status(owned.status).json({ message: owned.message });

    const result = await pool.query(
      'UPDATE payment_alerts SET tenant_id=$1, due_date=$2, amount=$3, frequency=$4, is_enabled=$5, updated_at=NOW() WHERE id=$6 AND landlord_id=$7 RETURNING *',
      [owned.tenantId, dueDate, amount, frequency, isEnabled, id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Alert not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deletePaymentAlert = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM payment_alerts WHERE id=$1 AND landlord_id=$2 RETURNING *',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Alert not found' });
    res.json({ message: 'Alert deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getOverdueAlerts = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT pa.*,
              pa.is_enabled AS alert_enabled,
              t.full_name AS tenant_name
       FROM payment_alerts pa
       LEFT JOIN tenants t ON pa.tenant_id = t.id
       WHERE pa.landlord_id=$1
         AND pa.due_date < NOW()
         AND pa.is_enabled=true
       ORDER BY pa.due_date ASC`,
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
