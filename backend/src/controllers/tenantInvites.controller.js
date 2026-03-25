const crypto = require('crypto');
const pool = require('../config/db');
const { ensureOptionalTables } = require('../services/schemaBootstrap.service');

exports.createTenantInvite = async (req, res) => {
  const landlordId = req.user.id;
  const { tenant_id, expires_in_days } = req.body || {};
  const tenantId = Number(tenant_id);
  const days = expires_in_days == null ? 7 : Number(expires_in_days);

  if (!Number.isFinite(tenantId) || tenantId <= 0) {
    return res.status(400).json({ message: 'tenant_id is required' });
  }
  if (!Number.isFinite(days) || days < 1 || days > 60) {
    return res.status(400).json({ message: 'expires_in_days must be between 1 and 60' });
  }

  try {
    await ensureOptionalTables();

    // Ensure tenant belongs to landlord.
    const tenantRes = await pool.query(
      `SELECT t.id, t.full_name, t.email, t.user_id
       FROM tenants t
       JOIN units u ON t.unit_id=u.id
       JOIN properties p ON u.property_id=p.id
       WHERE t.id=$1 AND p.landlord_id=$2
       LIMIT 1`,
      [tenantId, landlordId]
    );
    if (!tenantRes.rows.length) return res.status(404).json({ message: 'Tenant not found' });

    const tenant = tenantRes.rows[0];
    if (tenant.user_id) {
      return res.status(409).json({ message: 'Tenant already has an account' });
    }
    if (!tenant.email) {
      return res.status(400).json({ message: 'Tenant must have an email to create an account invite' });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const inviteRes = await pool.query(
      `INSERT INTO tenant_invites (token, landlord_id, tenant_id, expires_at)
       VALUES ($1,$2,$3,$4)
       RETURNING token, status, created_at, expires_at`,
      [token, landlordId, tenantId, expiresAt]
    );

    const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
    const public_url = `${frontendBase.replace(/\/$/, '')}/invite/${token}`;
    return res.status(201).json({ ...inviteRes.rows[0], public_url });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to create tenant invite' });
  }
};

