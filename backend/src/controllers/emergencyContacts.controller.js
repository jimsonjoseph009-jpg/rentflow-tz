const pool = require('../config/db');

exports.createEmergencyContact = async (req, res) => {
  const landlordId = req.user.id;
  const contactType = req.body.contactType ?? req.body.contact_type;
  const contactName = req.body.contactName ?? req.body.contact_name;
  const phone = req.body.phone ?? req.body.phone_number;
  const email = req.body.email ?? null;
  const address = req.body.address ?? null;
  const notes = req.body.notes ?? req.body.service_area ?? null;

  try {
    const result = await pool.query(
      'INSERT INTO emergency_contacts (landlord_id, contact_type, contact_name, phone, email, address, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *',
      [landlordId, contactType, contactName, phone, email, address, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getEmergencyContacts = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let landlordId = userId;

    if (userRole === 'tenant') {
      const tenantRes = await pool.query(
        `SELECT pr.landlord_id
         FROM tenants t
         JOIN units un ON t.unit_id = un.id
         JOIN properties pr ON un.property_id = pr.id
         WHERE t.user_id = $1`,
        [userId]
      );
      if (tenantRes.rows.length === 0) return res.status(404).json({ message: 'Landlord not found for this tenant' });
      landlordId = tenantRes.rows[0].landlord_id;
    }

    const result = await pool.query(
      `SELECT *,
              phone AS phone_number,
              notes AS service_area
       FROM emergency_contacts
       WHERE landlord_id=$1
       ORDER BY contact_type ASC`,
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getEmergencyContactById = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { id } = req.params;

  try {
    let landlordId = userId;

    if (userRole === 'tenant') {
      const tenantRes = await pool.query(
        `SELECT pr.landlord_id
         FROM tenants t
         JOIN units un ON t.unit_id = un.id
         JOIN properties pr ON un.property_id = pr.id
         WHERE t.user_id = $1`,
        [userId]
      );
      if (tenantRes.rows.length === 0) return res.status(404).json({ message: 'Landlord not found for this tenant' });
      landlordId = tenantRes.rows[0].landlord_id;
    }

    const result = await pool.query(
      'SELECT * FROM emergency_contacts WHERE id=$1 AND landlord_id=$2',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Contact not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateEmergencyContact = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const contactType = req.body.contactType ?? req.body.contact_type;
  const contactName = req.body.contactName ?? req.body.contact_name;
  const phone = req.body.phone ?? req.body.phone_number;
  const email = req.body.email ?? null;
  const address = req.body.address ?? null;
  const notes = req.body.notes ?? req.body.service_area ?? null;

  try {
    const result = await pool.query(
      'UPDATE emergency_contacts SET contact_type=$1, contact_name=$2, phone=$3, email=$4, address=$5, notes=$6, updated_at=NOW() WHERE id=$7 AND landlord_id=$8 RETURNING *',
      [contactType, contactName, phone, email, address, notes, id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Contact not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteEmergencyContact = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM emergency_contacts WHERE id=$1 AND landlord_id=$2 RETURNING *',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Contact not found' });
    res.json({ message: 'Contact deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getContactsByType = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { contactType } = req.params;

  try {
    let landlordId = userId;

    if (userRole === 'tenant') {
      const tenantRes = await pool.query(
        `SELECT pr.landlord_id
         FROM tenants t
         JOIN units un ON t.unit_id = un.id
         JOIN properties pr ON un.property_id = pr.id
         WHERE t.user_id = $1`,
        [userId]
      );
      if (tenantRes.rows.length === 0) return res.status(404).json({ message: 'Landlord not found for this tenant' });
      landlordId = tenantRes.rows[0].landlord_id;
    }

    const result = await pool.query(
      'SELECT * FROM emergency_contacts WHERE landlord_id=$1 AND contact_type=$2 ORDER BY contact_name ASC',
      [landlordId, contactType]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
