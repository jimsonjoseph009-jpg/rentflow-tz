const pool = require('../config/db');

const logActivity = async ({
  userId,
  tenantId = null,
  propertyId = null,
  eventType,
  title,
  description = null,
  source = 'system',
  metadata = null,
}) => {
  if (!userId || !eventType || !title) return null;

  try {
    const { rows } = await pool.query(
      `INSERT INTO activity_events
       (user_id, tenant_id, property_id, event_type, title, description, source, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        userId,
        tenantId,
        propertyId,
        eventType,
        title,
        description,
        source,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    return rows[0];
  } catch (error) {
    console.error('[activity] log failed:', error.message);
    return null;
  }
};

module.exports = {
  logActivity,
};
