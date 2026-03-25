const pool = require('../config/db');

exports.createTenant = async (req, res) => {
  const landlordId = req.user.id;
  const { unit_id, full_name, email, phone, lease_start, lease_end, latitude, longitude } = req.body;

  try {
    const unitCheck = await pool.query(
      `SELECT u.*, p.landlord_id
       FROM units u
       JOIN properties p ON u.property_id = p.id
       WHERE u.id=$1 AND p.landlord_id=$2`,
      [unit_id, landlordId]
    );
    if (unitCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Unit not found or unauthorized' });
    }

    const result = await pool.query(
      `INSERT INTO tenants (unit_id, full_name, email, phone, lease_start, lease_end, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [unit_id, full_name, email || null, phone, lease_start, lease_end, latitude || null, longitude || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTenants = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT t.*, u.unit_number, p.name AS property_name
       FROM tenants t
       JOIN units u ON t.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       WHERE p.landlord_id=$1`,
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTenant = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const { full_name, email, phone, lease_start, lease_end, unit_id, latitude, longitude } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tenants t
       SET full_name=COALESCE($1, full_name),
           email=COALESCE($2, email),
           phone=COALESCE($3, phone),
           lease_start=COALESCE($4, lease_start),
           lease_end=COALESCE($5, lease_end),
           unit_id=COALESCE($6, unit_id),
           latitude=COALESCE($7, latitude),
           longitude=COALESCE($8, longitude)
       FROM units u
       JOIN properties p ON u.property_id = p.id
       WHERE t.id=$9 AND t.unit_id=u.id AND p.landlord_id=$10
       RETURNING t.*`,
      [full_name || null, email || null, phone || null, lease_start || null, lease_end || null, unit_id || null, latitude || null, longitude || null, id, landlordId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTenantLocation = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const { latitude, longitude } = req.body;

  if (latitude == null || longitude == null) {
    return res.status(400).json({ message: 'latitude and longitude are required' });
  }

  try {
    const result = await pool.query(
      `UPDATE tenants t
       SET latitude=$1, longitude=$2
       FROM units u
       JOIN properties p ON u.property_id = p.id
       WHERE t.id=$3 AND t.unit_id=u.id AND p.landlord_id=$4
       RETURNING t.id, t.full_name, t.latitude, t.longitude`,
      [latitude, longitude, id, landlordId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteTenant = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    await pool.query(
      `DELETE FROM tenants t
       USING units u
       JOIN properties p ON u.property_id = p.id
       WHERE t.id=$1 AND t.unit_id=u.id AND p.landlord_id=$2`,
      [id, landlordId]
    );
    res.json({ message: 'Tenant deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
