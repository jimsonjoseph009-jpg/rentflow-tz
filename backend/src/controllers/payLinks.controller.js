const crypto = require('crypto');
const pool = require('../config/db');
const { ensureOptionalTables } = require('../services/schemaBootstrap.service');

const parsePositiveAmount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Number(parsed.toFixed(2));
};

exports.createPayLink = async (req, res) => {
  const landlordId = req.user.id;
  const { tenant_id, amount, expires_in_days } = req.body || {};

  const normalizedAmount = parsePositiveAmount(amount);
  if (!tenant_id || !normalizedAmount) {
    return res.status(400).json({ message: 'tenant_id and a positive amount are required' });
  }

  const days = expires_in_days == null ? 7 : Number(expires_in_days);
  if (!Number.isFinite(days) || days < 1 || days > 60) {
    return res.status(400).json({ message: 'expires_in_days must be between 1 and 60' });
  }

  try {
    await ensureOptionalTables();

    const tenantRes = await pool.query(
      `SELECT t.id AS tenant_id, u.property_id, p.landlord_id
       FROM tenants t
       JOIN units u ON t.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       WHERE t.id=$1 AND p.landlord_id=$2`,
      [tenant_id, landlordId]
    );

    if (!tenantRes.rows.length) {
      return res.status(404).json({ message: 'Tenant not found or unauthorized' });
    }

    const { property_id } = tenantRes.rows[0];
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const insertRes = await pool.query(
      `INSERT INTO pay_links (token, landlord_id, tenant_id, property_id, amount, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, token, tenant_id, property_id, amount, currency, status, created_at, expires_at`,
      [token, landlordId, tenant_id, property_id, normalizedAmount, expiresAt]
    );

    const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
    const public_url = `${frontendBase.replace(/\/$/, '')}/pay/${token}`;

    return res.status(201).json({ ...insertRes.rows[0], public_url });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to create pay link' });
  }
};
