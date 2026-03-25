const pool = require('../config/db');
const { ensureOptionalTables } = require('../services/schemaBootstrap.service');

const ALLOWED_ROLES = ['manager', 'accountant', 'viewer', 'support'];
const ALLOWED_STATUS = ['active', 'invited', 'suspended'];

const safeLower = (v) => String(v || '').trim().toLowerCase();

exports.getTeamMembers = async (req, res) => {
  try {
    await ensureOptionalTables();

    const result = await pool.query(
      `SELECT *
       FROM team_members
       WHERE landlord_id=$1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to fetch team members' });
  }
};

exports.createTeamMember = async (req, res) => {
  try {
    await ensureOptionalTables();

    const { full_name, email, role = 'manager', status = 'invited', permissions = null } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({ message: 'full_name and email are required' });
    }

    const safeRole = ALLOWED_ROLES.includes(safeLower(role)) ? safeLower(role) : 'manager';
    const safeStatus = ALLOWED_STATUS.includes(safeLower(status)) ? safeLower(status) : 'invited';

    const result = await pool.query(
      `INSERT INTO team_members (landlord_id, full_name, email, role, status, permissions)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (landlord_id, email)
       DO UPDATE SET
         full_name=EXCLUDED.full_name,
         role=EXCLUDED.role,
         status=EXCLUDED.status,
         permissions=EXCLUDED.permissions,
         updated_at=NOW()
       RETURNING *`,
      [req.user.id, full_name, email, safeRole, safeStatus, permissions ? JSON.stringify(permissions) : null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to create team member' });
  }
};

exports.updateTeamMember = async (req, res) => {
  try {
    await ensureOptionalTables();

    const { id } = req.params;
    const { full_name, email, role, status, permissions } = req.body;

    const safeRole = role ? (ALLOWED_ROLES.includes(safeLower(role)) ? safeLower(role) : null) : null;
    const safeStatus = status ? (ALLOWED_STATUS.includes(safeLower(status)) ? safeLower(status) : null) : null;

    const result = await pool.query(
      `UPDATE team_members
       SET full_name=COALESCE($1, full_name),
           email=COALESCE($2, email),
           role=COALESCE($3, role),
           status=COALESCE($4, status),
           permissions=COALESCE($5, permissions),
           updated_at=NOW()
       WHERE id=$6 AND landlord_id=$7
       RETURNING *`,
      [
        full_name || null,
        email || null,
        safeRole,
        safeStatus,
        permissions ? JSON.stringify(permissions) : null,
        id,
        req.user.id,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to update team member' });
  }
};

exports.deleteTeamMember = async (req, res) => {
  try {
    await ensureOptionalTables();

    const result = await pool.query(
      'DELETE FROM team_members WHERE id=$1 AND landlord_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    return res.json({ message: 'Team member removed' });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to delete team member' });
  }
};
