const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { ensureOptionalTables } = require('../services/schemaBootstrap.service');

const isExpired = (expiresAt) => {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
};

exports.getInvite = async (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!token) return res.status(400).json({ message: 'Token required' });

  try {
    await ensureOptionalTables();

    const { rows } = await pool.query(
      `SELECT i.status, i.expires_at, t.full_name AS tenant_name, t.email AS tenant_email, p.name AS property_name
       FROM tenant_invites i
       JOIN tenants t ON i.tenant_id=t.id
       JOIN units u ON t.unit_id=u.id
       JOIN properties p ON u.property_id=p.id
       WHERE i.token=$1
       LIMIT 1`,
      [token]
    );

    if (!rows.length) return res.status(404).json({ message: 'Invite not found' });
    const invite = rows[0];
    if (invite.status !== 'active') return res.status(410).json({ message: 'Invite is no longer active' });
    if (isExpired(invite.expires_at)) return res.status(410).json({ message: 'Invite has expired' });

    return res.json(invite);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to load invite' });
  }
};

exports.acceptInvite = async (req, res) => {
  const token = String(req.params.token || '').trim();
  const { password } = req.body || {};
  const passwordRaw = String(password || '');

  if (!token) return res.status(400).json({ message: 'Token required' });
  if (!passwordRaw || passwordRaw.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    await ensureOptionalTables();

    await pool.query('BEGIN');

    const inviteRes = await pool.query(
      `SELECT id, landlord_id, tenant_id, status, expires_at, used_user_id
       FROM tenant_invites
       WHERE token=$1
       FOR UPDATE`,
      [token]
    );

    if (!inviteRes.rows.length) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Invite not found' });
    }

    const invite = inviteRes.rows[0];
    if (invite.status !== 'active') {
      await pool.query('ROLLBACK');
      return res.status(410).json({ message: 'Invite is no longer active' });
    }
    if (isExpired(invite.expires_at)) {
      await pool.query('ROLLBACK');
      return res.status(410).json({ message: 'Invite has expired' });
    }
    if (invite.used_user_id) {
      await pool.query('ROLLBACK');
      return res.status(409).json({ message: 'Invite already used' });
    }

    const tenantRes = await pool.query(
      `SELECT t.id, t.full_name, t.email, t.user_id
       FROM tenants t
       JOIN units u ON t.unit_id=u.id
       JOIN properties p ON u.property_id=p.id
       WHERE t.id=$1 AND p.landlord_id=$2
       FOR UPDATE`,
      [invite.tenant_id, invite.landlord_id]
    );

    if (!tenantRes.rows.length) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Tenant not found for invite' });
    }

    const tenant = tenantRes.rows[0];
    if (tenant.user_id) {
      await pool.query('ROLLBACK');
      return res.status(409).json({ message: 'Tenant already has an account' });
    }
    if (!tenant.email) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Tenant email missing' });
    }

    const userExists = await pool.query('SELECT id FROM users WHERE email=$1 LIMIT 1', [tenant.email]);
    if (userExists.rows.length) {
      await pool.query('ROLLBACK');
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const hashed = await bcrypt.hash(passwordRaw, 10);
    const userRes = await pool.query(
      `INSERT INTO users(name,email,password_hash,role)
       VALUES($1,$2,$3,'tenant')
       RETURNING id, name, email, role`,
      [tenant.full_name, tenant.email, hashed]
    );

    const user = userRes.rows[0];

    await pool.query(`UPDATE tenants SET user_id=$1 WHERE id=$2`, [user.id, tenant.id]);
    await pool.query(
      `UPDATE tenant_invites
       SET status='used', used_user_id=$1, used_at=NOW()
       WHERE id=$2`,
      [user.id, invite.id]
    );

    await pool.query('COMMIT');

    return res.status(201).json({
      message: 'Account created successfully',
      user,
    });
  } catch (error) {
    try {
      await pool.query('ROLLBACK');
    } catch {}
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to accept invite' });
  }
};

