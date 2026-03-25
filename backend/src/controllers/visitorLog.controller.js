const pool = require('../config/db');
const { ensurePropertyOwnedByLandlord } = require('../services/ownership.service');

exports.createVisitorLog = async (req, res) => {
  let landlordId = req.user.id;
  let propertyId = req.body.propertyId ?? req.body.property_id;
  let visitorName = req.body.visitorName ?? req.body.visitor_name;
  const visitorPhone = req.body.visitorPhone ?? req.body.visitor_phone ?? req.body.contact_number ?? null;
  const purpose = req.body.purpose ?? null;
  const visitDate = req.body.visitDate ?? req.body.visit_date;
  const visitTime = req.body.visitTime ?? req.body.visit_time ?? null;
  let notes = req.body.notes ?? null;

  try {
    if (req.user.role === 'tenant') {
      const llRes = await pool.query(
        `SELECT pr.landlord_id, pr.id as property_id, u.name
         FROM tenants t
         JOIN units un ON t.unit_id = un.id
         JOIN properties pr ON un.property_id = pr.id
         JOIN users u ON t.user_id = u.id
         WHERE t.user_id = $1`,
        [req.user.id]
      );
      if (llRes.rows.length === 0) return res.status(403).json({ message: 'Tenant not linked to any property' });
      
      landlordId = llRes.rows[0].landlord_id;
      propertyId = llRes.rows[0].property_id;
      notes = `[Tenant Visitor: ${llRes.rows[0].name}] ${notes || ''}`.trim();
    } else {
      const owned = await ensurePropertyOwnedByLandlord(landlordId, propertyId);
      if (!owned.ok) return res.status(owned.status).json({ message: owned.message });
      propertyId = owned.propertyId;
    }

    const result = await pool.query(
      'INSERT INTO visitor_logs (landlord_id, property_id, visitor_name, visitor_phone, purpose, visit_date, visit_time, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *',
      [landlordId, propertyId, visitorName, visitorPhone, purpose, visitDate, visitTime, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getVisitorLogs = async (req, res) => {
  try {
    let query, params;
    
    if (req.user.role === 'tenant') {
      const llRes = await pool.query(
        `SELECT pr.landlord_id, pr.id as property_id
         FROM tenants t
         JOIN units un ON t.unit_id = un.id
         JOIN properties pr ON un.property_id = pr.id
         WHERE t.user_id = $1`,
        [req.user.id]
      );
      if (llRes.rows.length === 0) return res.status(403).json({ message: 'Tenant not linked to any property' });
      
      query = `SELECT vl.*,
                      vl.visitor_phone AS contact_number,
                      p.name AS property_name
               FROM visitor_logs vl
               LEFT JOIN properties p ON vl.property_id = p.id
               WHERE vl.landlord_id=$1 AND vl.property_id=$2
               ORDER BY vl.visit_date DESC, vl.visit_time DESC`;
      params = [llRes.rows[0].landlord_id, llRes.rows[0].property_id];
    } else {
      query = `SELECT vl.*,
                      vl.visitor_phone AS contact_number,
                      p.name AS property_name
               FROM visitor_logs vl
               LEFT JOIN properties p ON vl.property_id = p.id
               WHERE vl.landlord_id=$1
               ORDER BY vl.visit_date DESC, vl.visit_time DESC`;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getVisitorLogById = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM visitor_logs WHERE id=$1 AND landlord_id=$2',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Log not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateVisitorLog = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const propertyId = req.body.propertyId ?? req.body.property_id;
  const visitorName = req.body.visitorName ?? req.body.visitor_name;
  const visitorPhone = req.body.visitorPhone ?? req.body.visitor_phone ?? req.body.contact_number ?? null;
  const purpose = req.body.purpose ?? null;
  const visitDate = req.body.visitDate ?? req.body.visit_date;
  const visitTime = req.body.visitTime ?? req.body.visit_time ?? null;
  const notes = req.body.notes ?? null;

  try {
    const owned = await ensurePropertyOwnedByLandlord(landlordId, propertyId);
    if (!owned.ok) return res.status(owned.status).json({ message: owned.message });

    const result = await pool.query(
      'UPDATE visitor_logs SET property_id=$1, visitor_name=$2, visitor_phone=$3, purpose=$4, visit_date=$5, visit_time=$6, notes=$7, updated_at=NOW() WHERE id=$8 AND landlord_id=$9 RETURNING *',
      [owned.propertyId, visitorName, visitorPhone, purpose, visitDate, visitTime, notes, id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Log not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteVisitorLog = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM visitor_logs WHERE id=$1 AND landlord_id=$2 RETURNING *',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Log not found' });
    res.json({ message: 'Log deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getVisitorsByProperty = async (req, res) => {
  const landlordId = req.user.id;
  const { propertyId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM visitor_logs WHERE landlord_id=$1 AND property_id=$2 ORDER BY visit_date DESC, visit_time DESC',
      [landlordId, propertyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
