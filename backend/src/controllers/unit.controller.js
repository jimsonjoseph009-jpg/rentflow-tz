const pool = require('../config/db');

exports.createUnit = async (req, res) => {
  const landlordId = req.user.id;
  const { property_id, unit_number, rent_amount, status } = req.body;

  try {
    // Check property belongs to landlord
    const propertyCheck = await pool.query(
      'SELECT * FROM properties WHERE id=$1 AND landlord_id=$2',
      [property_id, landlordId]
    );
    if (propertyCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Property not found or unauthorized' });
    }

    const result = await pool.query(
      'INSERT INTO units (property_id, unit_number, rent_amount, status) VALUES ($1,$2,$3,$4) RETURNING *',
      [property_id, unit_number, rent_amount, status || 'vacant']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUnits = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT u.*, p.name AS property_name 
       FROM units u
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

exports.updateUnit = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const { unit_number, rent_amount, status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE units u
       SET unit_number=$1, rent_amount=$2, status=$3
       FROM properties p
       WHERE u.id=$4 AND u.property_id=p.id AND p.landlord_id=$5
       RETURNING u.*`,
      [unit_number, rent_amount, status, id, landlordId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUnit = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    await pool.query(
      `DELETE FROM units u
       USING properties p
       WHERE u.id=$1 AND u.property_id=p.id AND p.landlord_id=$2`,
      [id, landlordId]
    );
    res.json({ message: 'Unit deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
