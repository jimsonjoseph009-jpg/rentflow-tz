const pool = require('../config/db');

const toId = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
};

// Avoid leaking existence across landlords: treat "not owned" as not found.
exports.ensureTenantOwnedByLandlord = async (landlordId, tenantIdRaw) => {
  const tenantId = toId(tenantIdRaw);
  if (!tenantId) return { ok: false, status: 400, message: 'Invalid tenant_id' };

  const { rows } = await pool.query(
    `SELECT 1
     FROM tenants t
     JOIN units u ON t.unit_id=u.id
     JOIN properties p ON u.property_id=p.id
     WHERE t.id=$1 AND p.landlord_id=$2
     LIMIT 1`,
    [tenantId, landlordId]
  );

  if (!rows.length) return { ok: false, status: 404, message: 'Tenant not found' };
  return { ok: true, tenantId };
};

exports.ensurePropertyOwnedByLandlord = async (landlordId, propertyIdRaw) => {
  const propertyId = toId(propertyIdRaw);
  if (!propertyId) return { ok: false, status: 400, message: 'Invalid property_id' };

  const { rows } = await pool.query(
    `SELECT 1 FROM properties WHERE id=$1 AND landlord_id=$2 LIMIT 1`,
    [propertyId, landlordId]
  );

  if (!rows.length) return { ok: false, status: 404, message: 'Property not found' };
  return { ok: true, propertyId };
};

