const pool = require('../config/db');

exports.createOccupancyForecast = async (req, res) => {
  const landlordId = req.user.id;
  const propertyId = req.body.propertyId ?? req.body.property_id;
  const unitId = req.body.unitId ?? req.body.unit_id ?? null;
  const leaseEndDate = req.body.leaseEndDate ?? req.body.lease_end_date ?? req.body.lease_end;
  const tenantName = req.body.tenantName ?? req.body.tenant_name ?? null;
  const status = req.body.status;

  try {
    const result = await pool.query(
      'INSERT INTO occupancy_forecasts (landlord_id, property_id, unit_id, lease_end_date, tenant_name, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *',
      [landlordId, propertyId, unitId, leaseEndDate, tenantName, status || 'OCCUPIED']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getOccupancyForecasts = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT of.*,
              of.lease_end_date AS lease_end,
              p.name AS property_name,
              u.unit_number
       FROM occupancy_forecasts of
       LEFT JOIN properties p ON of.property_id = p.id
       LEFT JOIN units u ON of.unit_id = u.id
       WHERE of.landlord_id=$1
       ORDER BY of.lease_end_date ASC`,
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getOccupancyForecastById = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM occupancy_forecasts WHERE id=$1 AND landlord_id=$2',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Forecast not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateOccupancyForecast = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const propertyId = req.body.propertyId ?? req.body.property_id;
  const unitId = req.body.unitId ?? req.body.unit_id ?? null;
  const leaseEndDate = req.body.leaseEndDate ?? req.body.lease_end_date ?? req.body.lease_end;
  const tenantName = req.body.tenantName ?? req.body.tenant_name ?? null;
  const status = req.body.status;

  try {
    const result = await pool.query(
      'UPDATE occupancy_forecasts SET property_id=$1, unit_id=$2, lease_end_date=$3, tenant_name=$4, status=$5, updated_at=NOW() WHERE id=$6 AND landlord_id=$7 RETURNING *',
      [propertyId, unitId, leaseEndDate, tenantName, status, id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Forecast not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteOccupancyForecast = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM occupancy_forecasts WHERE id=$1 AND landlord_id=$2 RETURNING *',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Forecast not found' });
    res.json({ message: 'Forecast deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPropertyOccupancy = async (req, res) => {
  const landlordId = req.user.id;
  const { propertyId } = req.params;

  try {
    const result = await pool.query(
      'SELECT status, COUNT(*) as count FROM occupancy_forecasts WHERE landlord_id=$1 AND property_id=$2 GROUP BY status',
      [landlordId, propertyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
