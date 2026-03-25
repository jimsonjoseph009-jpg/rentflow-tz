const pool = require('../config/db');
const { ensureTenantOwnedByLandlord } = require('../services/ownership.service');
const toBool = (value, fallback = true) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
};

const serializePetNotes = ({ notes, breed, weight }) => {
  if (!breed && !weight) return notes || null;
  return JSON.stringify({ notes: notes || null, breed: breed || null, weight: weight || null });
};

const parsePetNotes = (value) => {
  if (!value) return { notes: null, breed: null, weight: null };
  try {
    const parsed = JSON.parse(value);
    return {
      notes: parsed.notes ?? null,
      breed: parsed.breed ?? null,
      weight: parsed.weight ?? null,
    };
  } catch {
    return { notes: value, breed: null, weight: null };
  }
};

exports.createPetPolicy = async (req, res) => {
  const landlordId = req.user.id;
  const tenantId = req.body.tenantId ?? req.body.tenant_id;
  const petType = req.body.petType ?? req.body.pet_type;
  const petName = req.body.petName ?? req.body.pet_name;
  const isCompliantRaw = req.body.isCompliant ?? req.body.policy_compliant;
  const isCompliant = toBool(isCompliantRaw, true);
  const notes = serializePetNotes({
    notes: req.body.notes,
    breed: req.body.breed,
    weight: req.body.weight,
  });

  try {
    const owned = await ensureTenantOwnedByLandlord(landlordId, tenantId);
    if (!owned.ok) return res.status(owned.status).json({ message: owned.message });

    const result = await pool.query(
      'INSERT INTO pet_policies (landlord_id, tenant_id, pet_type, pet_name, is_compliant, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *',
      [landlordId, owned.tenantId, petType, petName, isCompliant, notes]
    );
    const meta = parsePetNotes(result.rows[0].notes);
    res.status(201).json({ ...result.rows[0], ...meta, policy_compliant: result.rows[0].is_compliant });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPetPolicies = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT pp.*, pp.is_compliant AS policy_compliant, t.full_name AS tenant_name FROM pet_policies pp LEFT JOIN tenants t ON pp.tenant_id = t.id WHERE pp.landlord_id=$1 ORDER BY pp.created_at DESC',
      [landlordId]
    );
    res.json(result.rows.map((row) => ({ ...row, ...parsePetNotes(row.notes) })));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPetPolicyById = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM pet_policies WHERE id=$1 AND landlord_id=$2',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Pet policy not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePetPolicy = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const tenantId = req.body.tenantId ?? req.body.tenant_id;
  const petType = req.body.petType ?? req.body.pet_type;
  const petName = req.body.petName ?? req.body.pet_name;
  const isCompliant = toBool(req.body.isCompliant ?? req.body.policy_compliant, true);
  const notes = serializePetNotes({
    notes: req.body.notes,
    breed: req.body.breed,
    weight: req.body.weight,
  });

  try {
    const owned = await ensureTenantOwnedByLandlord(landlordId, tenantId);
    if (!owned.ok) return res.status(owned.status).json({ message: owned.message });

    const result = await pool.query(
      'UPDATE pet_policies SET tenant_id=$1, pet_type=$2, pet_name=$3, is_compliant=$4, notes=$5, updated_at=NOW() WHERE id=$6 AND landlord_id=$7 RETURNING *',
      [owned.tenantId, petType, petName, isCompliant, notes, id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Pet policy not found' });
    const meta = parsePetNotes(result.rows[0].notes);
    res.json({ ...result.rows[0], ...meta, policy_compliant: result.rows[0].is_compliant });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deletePetPolicy = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM pet_policies WHERE id=$1 AND landlord_id=$2 RETURNING *',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Pet policy not found' });
    res.json({ message: 'Pet policy deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getNonCompliantPets = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT pp.*, pp.is_compliant AS policy_compliant, t.full_name AS tenant_name FROM pet_policies pp LEFT JOIN tenants t ON pp.tenant_id = t.id WHERE pp.landlord_id=$1 AND pp.is_compliant=false ORDER BY pp.created_at DESC',
      [landlordId]
    );
    res.json(result.rows.map((row) => ({ ...row, ...parsePetNotes(row.notes) })));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPetsByType = async (req, res) => {
  const landlordId = req.user.id;
  const { petType } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM pet_policies WHERE landlord_id=$1 AND pet_type=$2 ORDER BY pet_name ASC',
      [landlordId, petType]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
