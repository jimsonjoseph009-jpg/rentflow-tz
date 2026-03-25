const pool = require('../config/db');

exports.createUtilityMeter = async (req, res) => {
  const landlordId = req.user.id;
  const unitId = req.body.unitId ?? req.body.unit_id;
  const meterType = req.body.meterType ?? req.body.meter_type;
  const reading = req.body.reading;
  const readingDate = req.body.readingDate ?? req.body.reading_date;
  const cost = req.body.cost ?? null;
  const notes = req.body.notes ?? null;
  let propertyId = req.body.propertyId ?? req.body.property_id ?? null;

  try {
    if (!propertyId && unitId) {
      const unitRes = await pool.query('SELECT property_id FROM units WHERE id=$1', [unitId]);
      propertyId = unitRes.rows[0]?.property_id || null;
    }
    if (!propertyId || !unitId) {
      return res.status(400).json({ message: 'unit_id is required and must belong to a property' });
    }

    const result = await pool.query(
      'INSERT INTO utility_meters (landlord_id, property_id, unit_id, meter_type, reading, reading_date, cost, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *',
      [landlordId, propertyId, unitId, meterType, reading, readingDate, cost, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUtilityMeters = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT um.*, p.name as property_name, u.unit_number FROM utility_meters um LEFT JOIN properties p ON um.property_id = p.id LEFT JOIN units u ON um.unit_id = u.id WHERE um.landlord_id=$1 ORDER BY um.reading_date DESC',
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUtilityMeterById = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM utility_meters WHERE id=$1 AND landlord_id=$2',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Meter record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUtilityMeter = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const unitId = req.body.unitId ?? req.body.unit_id;
  const meterType = req.body.meterType ?? req.body.meter_type;
  const reading = req.body.reading;
  const readingDate = req.body.readingDate ?? req.body.reading_date;
  const cost = req.body.cost ?? null;
  const notes = req.body.notes ?? null;
  let propertyId = req.body.propertyId ?? req.body.property_id ?? null;

  try {
    if (!propertyId && unitId) {
      const unitRes = await pool.query('SELECT property_id FROM units WHERE id=$1', [unitId]);
      propertyId = unitRes.rows[0]?.property_id || null;
    }
    if (!propertyId || !unitId) {
      return res.status(400).json({ message: 'unit_id is required and must belong to a property' });
    }

    const result = await pool.query(
      'UPDATE utility_meters SET property_id=$1, unit_id=$2, meter_type=$3, reading=$4, reading_date=$5, cost=$6, notes=$7, updated_at=NOW() WHERE id=$8 AND landlord_id=$9 RETURNING *',
      [propertyId, unitId, meterType, reading, readingDate, cost, notes, id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Meter record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUtilityMeter = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM utility_meters WHERE id=$1 AND landlord_id=$2 RETURNING *',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Meter record not found' });
    res.json({ message: 'Meter record deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMetersByType = async (req, res) => {
  const landlordId = req.user.id;
  const { meterType } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM utility_meters WHERE landlord_id=$1 AND meter_type=$2 ORDER BY reading_date DESC',
      [landlordId, meterType]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
