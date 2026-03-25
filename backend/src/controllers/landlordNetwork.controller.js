const pool = require('../config/db');

exports.createLandlordNetworkMember = async (req, res) => {
  const landlordId = req.user.id;
  const memberName = req.body.memberName ?? req.body.member_name ?? req.body.landlord_name;
  const email = req.body.email ?? null;
  const phone = req.body.phone ?? null;
  const propertiesCount = req.body.propertiesCount ?? req.body.properties_count ?? 0;
  const yearsExperience = req.body.yearsExperience ?? req.body.years_experience ?? req.body.experience_years ?? 0;
  const notes = req.body.notes ?? req.body.city ?? null;

  try {
    const result = await pool.query(
      'INSERT INTO landlord_network (landlord_id, member_name, email, phone, properties_count, years_experience, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *',
      [landlordId, memberName, email, phone, propertiesCount, yearsExperience, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLandlordNetworkMembers = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT *,
              member_name AS landlord_name,
              years_experience AS experience_years,
              COALESCE(notes, '') AS city
       FROM landlord_network
       WHERE landlord_id=$1
       ORDER BY member_name ASC`,
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLandlordNetworkMemberById = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM landlord_network WHERE id=$1 AND landlord_id=$2',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Member not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateLandlordNetworkMember = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const memberName = req.body.memberName ?? req.body.member_name ?? req.body.landlord_name;
  const email = req.body.email ?? null;
  const phone = req.body.phone ?? null;
  const propertiesCount = req.body.propertiesCount ?? req.body.properties_count ?? 0;
  const yearsExperience = req.body.yearsExperience ?? req.body.years_experience ?? req.body.experience_years ?? 0;
  const notes = req.body.notes ?? req.body.city ?? null;

  try {
    const result = await pool.query(
      'UPDATE landlord_network SET member_name=$1, email=$2, phone=$3, properties_count=$4, years_experience=$5, notes=$6, updated_at=NOW() WHERE id=$7 AND landlord_id=$8 RETURNING *',
      [memberName, email, phone, propertiesCount, yearsExperience, notes, id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Member not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteLandlordNetworkMember = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM landlord_network WHERE id=$1 AND landlord_id=$2 RETURNING *',
      [id, landlordId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Member not found' });
    res.json({ message: 'Member deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getNetworkStats = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as total_members, AVG(properties_count) as avg_properties, AVG(years_experience) as avg_experience FROM landlord_network WHERE landlord_id=$1',
      [landlordId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
