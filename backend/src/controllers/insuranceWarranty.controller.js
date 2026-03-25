const pool = require('../config/db');
const { ensurePropertyOwnedByLandlord } = require('../services/ownership.service');

exports.createInsuranceWarranty = async (req, res) => {
  const landlordId = req.user.id;
  const propertyId = req.body.propertyId ?? req.body.property_id;
  const recordType = req.body.recordType ?? req.body.record_type ?? req.body.type;
  const provider = req.body.provider ?? null;
  const policyNumber = req.body.policyNumber ?? req.body.policy_number ?? null;
  const startDate = req.body.startDate ?? req.body.start_date ?? null;
  const expiryDate = req.body.expiryDate ?? req.body.expiry_date;
  const notes = req.body.notes ?? req.body.item_description ?? null;

  try {
    const owned = await ensurePropertyOwnedByLandlord(landlordId, propertyId);
    if (!owned.ok) return res.status(owned.status).json({ message: owned.message });

    const result = await pool.query(
      'INSERT INTO insurance_warranty (landlord_id, property_id, record_type, provider, policy_number, start_date, expiry_date, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *',
      [landlordId, owned.propertyId, recordType, provider, policyNumber, startDate, expiryDate, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getInsuranceWarranties = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT iw.*,
              iw.record_type AS type,
              iw.notes AS item_description,
              p.name AS property_name
       FROM insurance_warranty iw
       LEFT JOIN properties p ON iw.property_id = p.id
       WHERE iw.landlord_id=$1
       ORDER BY iw.expiry_date ASC`,
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getInsuranceWarrantyById = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM insurance_warranty WHERE id=$1 AND landlord_id=$2',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateInsuranceWarranty = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const propertyId = req.body.propertyId ?? req.body.property_id;
  const recordType = req.body.recordType ?? req.body.record_type ?? req.body.type;
  const provider = req.body.provider ?? null;
  const policyNumber = req.body.policyNumber ?? req.body.policy_number ?? null;
  const startDate = req.body.startDate ?? req.body.start_date ?? null;
  const expiryDate = req.body.expiryDate ?? req.body.expiry_date;
  const notes = req.body.notes ?? req.body.item_description ?? null;

  try {
    const owned = await ensurePropertyOwnedByLandlord(landlordId, propertyId);
    if (!owned.ok) return res.status(owned.status).json({ message: owned.message });

    const result = await pool.query(
      'UPDATE insurance_warranty SET property_id=$1, record_type=$2, provider=$3, policy_number=$4, start_date=$5, expiry_date=$6, notes=$7, updated_at=NOW() WHERE id=$8 AND landlord_id=$9 RETURNING *',
      [owned.propertyId, recordType, provider, policyNumber, startDate, expiryDate, notes, id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteInsuranceWarranty = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM insurance_warranty WHERE id=$1 AND landlord_id=$2 RETURNING *',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getExpiringRecords = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT iw.*, p.name as property_name FROM insurance_warranty iw LEFT JOIN properties p ON iw.property_id = p.id WHERE iw.landlord_id=$1 AND iw.expiry_date <= CURRENT_DATE + INTERVAL \'30 days\' AND iw.expiry_date > CURRENT_DATE ORDER BY iw.expiry_date ASC',
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getExpiredRecords = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT iw.*, p.name as property_name FROM insurance_warranty iw LEFT JOIN properties p ON iw.property_id = p.id WHERE iw.landlord_id=$1 AND iw.expiry_date < CURRENT_DATE ORDER BY iw.expiry_date DESC',
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getRecordsByType = async (req, res) => {
  const landlordId = req.user.id;
  const { recordType } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM insurance_warranty WHERE landlord_id=$1 AND record_type=$2 ORDER BY expiry_date ASC',
      [landlordId, recordType]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
