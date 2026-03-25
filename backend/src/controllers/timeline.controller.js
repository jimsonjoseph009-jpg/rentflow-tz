const pool = require('../config/db');

exports.getTenantTimeline = async (req, res) => {
  const landlordId = req.user.id;
  const tenantId = Number(req.params.tenantId);

  if (!tenantId) {
    return res.status(400).json({ message: 'Invalid tenantId' });
  }

  try {
    const accessCheck = await pool.query(
      `SELECT 1
       FROM tenants t
       JOIN units u ON t.unit_id=u.id
       JOIN properties p ON u.property_id=p.id
       WHERE t.id=$1 AND p.landlord_id=$2`,
      [tenantId, landlordId]
    );

    if (!accessCheck.rows.length) {
      return res.status(404).json({ message: 'Tenant not found or unauthorized' });
    }

    const { rows } = await pool.query(
      `SELECT id, event_type, title, description, source, metadata, created_at
       FROM activity_events
       WHERE user_id=$1 AND tenant_id=$2
       ORDER BY created_at DESC
       LIMIT 300`,
      [landlordId, tenantId]
    );

    return res.json(rows);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to fetch tenant timeline' });
  }
};

exports.getPropertyTimeline = async (req, res) => {
  const landlordId = req.user.id;
  const propertyId = Number(req.params.propertyId);

  if (!propertyId) {
    return res.status(400).json({ message: 'Invalid propertyId' });
  }

  try {
    const accessCheck = await pool.query('SELECT 1 FROM properties WHERE id=$1 AND landlord_id=$2', [propertyId, landlordId]);
    if (!accessCheck.rows.length) {
      return res.status(404).json({ message: 'Property not found or unauthorized' });
    }

    const { rows } = await pool.query(
      `SELECT id, tenant_id, event_type, title, description, source, metadata, created_at
       FROM activity_events
       WHERE user_id=$1 AND property_id=$2
       ORDER BY created_at DESC
       LIMIT 300`,
      [landlordId, propertyId]
    );

    return res.json(rows);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to fetch property timeline' });
  }
};
