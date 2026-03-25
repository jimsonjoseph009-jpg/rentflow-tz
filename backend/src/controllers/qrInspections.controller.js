const pool = require('../config/db');
const { ensurePropertyOwnedByLandlord } = require('../services/ownership.service');

exports.createQRInspection = async (req, res) => {
  const landlordId = req.user.id;
  const propertyId = req.body.propertyId ?? req.body.property_id;
  const qrCode = req.body.qrCode ?? req.body.qr_code ?? null;
  const condition = (req.body.condition ?? req.body.condition_status ?? 'GOOD').toUpperCase();
  const inspectionDate = req.body.inspectionDate ?? req.body.inspection_date;
  const inspectionNotes = req.body.inspectionNotes ?? req.body.inspection_notes ?? req.body.notes ?? null;

  try {
    const owned = await ensurePropertyOwnedByLandlord(landlordId, propertyId);
    if (!owned.ok) return res.status(owned.status).json({ message: owned.message });

    const result = await pool.query(
      'INSERT INTO qr_inspections (landlord_id, property_id, qr_code, condition, inspection_date, inspection_notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *',
      [landlordId, owned.propertyId, qrCode, condition || 'GOOD', inspectionDate, inspectionNotes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getQRInspections = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT qi.*,
              LOWER(qi.condition) AS condition_status,
              qi.inspection_notes AS notes,
              p.name as property_name
       FROM qr_inspections qi
       LEFT JOIN properties p ON qi.property_id = p.id
       WHERE qi.landlord_id=$1
       ORDER BY qi.inspection_date DESC`,
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getQRInspectionById = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM qr_inspections WHERE id=$1 AND landlord_id=$2',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Inspection not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateQRInspection = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const propertyId = req.body.propertyId ?? req.body.property_id;
  const qrCode = req.body.qrCode ?? req.body.qr_code ?? null;
  const condition = (req.body.condition ?? req.body.condition_status ?? 'GOOD').toUpperCase();
  const inspectionDate = req.body.inspectionDate ?? req.body.inspection_date;
  const inspectionNotes = req.body.inspectionNotes ?? req.body.inspection_notes ?? req.body.notes ?? null;

  try {
    const owned = await ensurePropertyOwnedByLandlord(landlordId, propertyId);
    if (!owned.ok) return res.status(owned.status).json({ message: owned.message });

    const result = await pool.query(
      'UPDATE qr_inspections SET property_id=$1, qr_code=$2, condition=$3, inspection_date=$4, inspection_notes=$5, updated_at=NOW() WHERE id=$6 AND landlord_id=$7 RETURNING *',
      [owned.propertyId, qrCode, condition, inspectionDate, inspectionNotes, id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Inspection not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteQRInspection = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM qr_inspections WHERE id=$1 AND landlord_id=$2 RETURNING *',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Inspection not found' });
    res.json({ message: 'Inspection deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getInspectionsByProperty = async (req, res) => {
  const landlordId = req.user.id;
  const { propertyId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM qr_inspections WHERE landlord_id=$1 AND property_id=$2 ORDER BY inspection_date DESC',
      [landlordId, propertyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getInspectionsByCondition = async (req, res) => {
  const landlordId = req.user.id;
  const { condition } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM qr_inspections WHERE landlord_id=$1 AND condition=$2 ORDER BY inspection_date DESC',
      [landlordId, condition]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
