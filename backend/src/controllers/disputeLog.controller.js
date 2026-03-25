const pool = require('../config/db');

const serializeDisputeNotes = ({ notes, complaintTitle, resolutionNotes }) => {
  const hasExtras = complaintTitle || resolutionNotes;
  if (!hasExtras) return notes || null;
  return JSON.stringify({
    notes: notes || null,
    complaint_title: complaintTitle || null,
    resolution_notes: resolutionNotes || null,
  });
};

const parseDisputeNotes = (value) => {
  if (!value) return { notes: null, complaint_title: '', resolution_notes: '' };
  try {
    const parsed = JSON.parse(value);
    return {
      notes: parsed.notes ?? null,
      complaint_title: parsed.complaint_title ?? '',
      resolution_notes: parsed.resolution_notes ?? '',
    };
  } catch {
    return { notes: value, complaint_title: '', resolution_notes: '' };
  }
};

exports.createDispute = async (req, res) => {
  const landlordId = req.user.id;
  const tenantId = req.body.tenantId ?? req.body.tenant_id;
  const category = req.body.category;
  const severity = req.body.severity;
  const description = req.body.description ?? null;
  const status = (req.body.status || 'OPEN').toUpperCase();
  const notes = serializeDisputeNotes({
    notes: req.body.notes,
    complaintTitle: req.body.complaint_title,
    resolutionNotes: req.body.resolution_notes,
  });

  try {
    const result = await pool.query(
      'INSERT INTO dispute_logs (landlord_id, tenant_id, category, severity, description, status, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *',
      [landlordId, tenantId, category, severity, description, status, notes]
    );
    res.status(201).json({ ...result.rows[0], ...parseDisputeNotes(result.rows[0].notes) });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getDisputes = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT dl.*, t.full_name as tenant_name FROM dispute_logs dl LEFT JOIN tenants t ON dl.tenant_id = t.id WHERE dl.landlord_id=$1 ORDER BY dl.created_at DESC',
      [landlordId]
    );
    res.json(result.rows.map((row) => ({ ...row, ...parseDisputeNotes(row.notes) })));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getDisputeById = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM dispute_logs WHERE id=$1 AND landlord_id=$2',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Dispute not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateDispute = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const tenantId = req.body.tenantId ?? req.body.tenant_id;
  const category = req.body.category;
  const severity = req.body.severity;
  const description = req.body.description ?? null;
  const status = req.body.status ? String(req.body.status).toUpperCase() : null;
  const notes = serializeDisputeNotes({
    notes: req.body.notes,
    complaintTitle: req.body.complaint_title,
    resolutionNotes: req.body.resolution_notes,
  });

  try {
    const result = await pool.query(
      'UPDATE dispute_logs SET tenant_id=$1, category=$2, severity=$3, description=$4, status=$5, notes=$6, updated_at=NOW() WHERE id=$7 AND landlord_id=$8 RETURNING *',
      [tenantId, category, severity, description, status, notes, id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Dispute not found' });
    res.json({ ...result.rows[0], ...parseDisputeNotes(result.rows[0].notes) });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteDispute = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM dispute_logs WHERE id=$1 AND landlord_id=$2 RETURNING *',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Dispute not found' });
    res.json({ message: 'Dispute deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getOpenDisputes = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT dl.*, t.full_name as tenant_name FROM dispute_logs dl LEFT JOIN tenants t ON dl.tenant_id = t.id WHERE dl.landlord_id=$1 AND UPPER(COALESCE(dl.status, \'\')) != \'RESOLVED\' ORDER BY dl.severity DESC, dl.created_at DESC',
      [landlordId]
    );
    res.json(result.rows.map((row) => ({ ...row, ...parseDisputeNotes(row.notes) })));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getDisputesByStatus = async (req, res) => {
  const landlordId = req.user.id;
  const { status } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM dispute_logs WHERE landlord_id=$1 AND status=$2 ORDER BY created_at DESC',
      [landlordId, status]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getDisputesByCategory = async (req, res) => {
  const landlordId = req.user.id;
  const { category } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM dispute_logs WHERE landlord_id=$1 AND category=$2 ORDER BY created_at DESC',
      [landlordId, category]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getDisputeStats = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT status, COUNT(*) as count FROM dispute_logs WHERE landlord_id=$1 GROUP BY status',
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
