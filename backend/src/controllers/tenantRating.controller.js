const pool = require('../config/db');
const { ensureTenantOwnedByLandlord } = require('../services/ownership.service');

exports.createTenantRating = async (req, res) => {
  const landlordId = req.user.id;
  const tenantId = req.body.tenantId ?? req.body.tenant_id;
  const paymentScore = req.body.paymentScore ?? req.body.payment_history;
  const behaviorScore = req.body.behaviorScore ?? req.body.behavior;
  const reliabilityScore = req.body.reliabilityScore ?? req.body.reliability;
  const notes = req.body.notes ?? req.body.comments ?? null;

  try {
    const owned = await ensureTenantOwnedByLandlord(landlordId, tenantId);
    if (!owned.ok) return res.status(owned.status).json({ message: owned.message });

    const averageScore = (parseInt(paymentScore) + parseInt(behaviorScore) + parseInt(reliabilityScore)) / 3;
    
    const result = await pool.query(
      'INSERT INTO tenant_ratings (landlord_id, tenant_id, payment_score, behavior_score, reliability_score, average_score, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *',
      [landlordId, owned.tenantId, paymentScore, behaviorScore, reliabilityScore, averageScore.toFixed(2), notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTenantRatings = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT tr.*,
              tr.payment_score AS payment_history,
              tr.behavior_score AS behavior,
              tr.reliability_score AS reliability,
              tr.notes AS comments,
              t.full_name AS tenant_name
       FROM tenant_ratings tr
       LEFT JOIN tenants t ON tr.tenant_id = t.id
       WHERE tr.landlord_id=$1
       ORDER BY tr.created_at DESC`,
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTenantRatingById = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM tenant_ratings WHERE id=$1 AND landlord_id=$2',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Rating not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTenantRating = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const tenantId = req.body.tenantId ?? req.body.tenant_id;
  const paymentScore = req.body.paymentScore ?? req.body.payment_history;
  const behaviorScore = req.body.behaviorScore ?? req.body.behavior;
  const reliabilityScore = req.body.reliabilityScore ?? req.body.reliability;
  const notes = req.body.notes ?? req.body.comments ?? null;

  try {
    const owned = await ensureTenantOwnedByLandlord(landlordId, tenantId);
    if (!owned.ok) return res.status(owned.status).json({ message: owned.message });

    const averageScore = (parseInt(paymentScore) + parseInt(behaviorScore) + parseInt(reliabilityScore)) / 3;
    
    const result = await pool.query(
      'UPDATE tenant_ratings SET tenant_id=$1, payment_score=$2, behavior_score=$3, reliability_score=$4, average_score=$5, notes=$6, updated_at=NOW() WHERE id=$7 AND landlord_id=$8 RETURNING *',
      [owned.tenantId, paymentScore, behaviorScore, reliabilityScore, averageScore.toFixed(2), notes, id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Rating not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteTenantRating = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM tenant_ratings WHERE id=$1 AND landlord_id=$2 RETURNING *',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Rating not found' });
    res.json({ message: 'Rating deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
