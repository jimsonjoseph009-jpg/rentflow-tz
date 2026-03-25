const pool = require('../config/db');
const { ensureTenantOwnedByLandlord } = require('../services/ownership.service');

const serializeVehicleNotes = ({ notes, makeModel, color }) => {
  if (!makeModel && !color) return notes || null;
  return JSON.stringify({ notes: notes || null, make_model: makeModel || null, color: color || null });
};

const parseVehicleNotes = (value) => {
  if (!value) return { notes: null, make_model: null, color: null };
  try {
    const parsed = JSON.parse(value);
    return {
      notes: parsed.notes ?? null,
      make_model: parsed.make_model ?? null,
      color: parsed.color ?? null,
    };
  } catch {
    return { notes: value, make_model: null, color: null };
  }
};

exports.createVehicle = async (req, res) => {
  const landlordId = req.user.id;
  const tenantId = req.body.tenantId ?? req.body.tenant_id;
  const vehicleType = req.body.vehicleType ?? req.body.vehicle_type;
  const registrationNumber = req.body.registrationNumber ?? req.body.registration_number;
  const parkingSpot = req.body.parkingSpot ?? req.body.parking_spot ?? null;
  const notes = serializeVehicleNotes({
    notes: req.body.notes,
    makeModel: req.body.makeModel ?? req.body.make_model,
    color: req.body.color,
  });

  try {
    const owned = await ensureTenantOwnedByLandlord(landlordId, tenantId);
    if (!owned.ok) return res.status(owned.status).json({ message: owned.message });

    const result = await pool.query(
      'INSERT INTO vehicle_management (landlord_id, tenant_id, vehicle_type, registration_number, parking_spot, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *',
      [landlordId, owned.tenantId, vehicleType, String(registrationNumber || '').toUpperCase(), parkingSpot, notes]
    );
    res.status(201).json({ ...result.rows[0], ...parseVehicleNotes(result.rows[0].notes) });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getVehicles = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT vm.*, t.full_name AS tenant_name FROM vehicle_management vm LEFT JOIN tenants t ON vm.tenant_id = t.id WHERE vm.landlord_id=$1 ORDER BY vm.parking_spot ASC',
      [landlordId]
    );
    res.json(result.rows.map((row) => ({ ...row, ...parseVehicleNotes(row.notes) })));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getVehicleById = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM vehicle_management WHERE id=$1 AND landlord_id=$2',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateVehicle = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const tenantId = req.body.tenantId ?? req.body.tenant_id;
  const vehicleType = req.body.vehicleType ?? req.body.vehicle_type;
  const registrationNumber = req.body.registrationNumber ?? req.body.registration_number;
  const parkingSpot = req.body.parkingSpot ?? req.body.parking_spot ?? null;
  const notes = serializeVehicleNotes({
    notes: req.body.notes,
    makeModel: req.body.makeModel ?? req.body.make_model,
    color: req.body.color,
  });

  try {
    const owned = await ensureTenantOwnedByLandlord(landlordId, tenantId);
    if (!owned.ok) return res.status(owned.status).json({ message: owned.message });

    const result = await pool.query(
      'UPDATE vehicle_management SET tenant_id=$1, vehicle_type=$2, registration_number=$3, parking_spot=$4, notes=$5, updated_at=NOW() WHERE id=$6 AND landlord_id=$7 RETURNING *',
      [owned.tenantId, vehicleType, String(registrationNumber || '').toUpperCase(), parkingSpot, notes, id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ ...result.rows[0], ...parseVehicleNotes(result.rows[0].notes) });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteVehicle = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM vehicle_management WHERE id=$1 AND landlord_id=$2 RETURNING *',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getVehiclesByType = async (req, res) => {
  const landlordId = req.user.id;
  const { vehicleType } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM vehicle_management WHERE landlord_id=$1 AND vehicle_type=$2 ORDER BY parking_spot ASC',
      [landlordId, vehicleType]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTenantVehicles = async (req, res) => {
  const landlordId = req.user.id;
  const { tenantId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM vehicle_management WHERE landlord_id=$1 AND tenant_id=$2 ORDER BY vehicle_type ASC',
      [landlordId, tenantId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
