const pool = require('../config/db');
const { notifySavedSearchMatches } = require('./propertyDiscovery.controller');

exports.createProperty = async (req, res) => {
  const landlordId = req.user.id;
  const { name, location, address, units, latitude, longitude } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO properties (landlord_id, name, location, address, units, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        landlordId,
        name,
        location || address || null,
        address || location || null,
        units || null,
        latitude || null,
        longitude || null,
      ]
    );
    const created = result.rows[0];
    await notifySavedSearchMatches({ landlordId, property: created });
    res.json(created);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProperties = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT id, landlord_id, name,
              COALESCE(address, location) AS address,
              location,
              units,
              latitude,
              longitude,
              created_at
       FROM properties
       WHERE landlord_id=$1
       ORDER BY id DESC`,
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPropertiesMap = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT id, name, COALESCE(address, location) AS address, latitude, longitude
       FROM properties
       WHERE landlord_id=$1 AND latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY name ASC`,
      [landlordId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProperty = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const { name, location, address, units, latitude, longitude } = req.body;

  try {
    const result = await pool.query(
      `UPDATE properties
       SET name=COALESCE($1, name),
           location=COALESCE($2, location),
           address=COALESCE($3, address),
           units=COALESCE($4, units),
           latitude=COALESCE($5, latitude),
           longitude=COALESCE($6, longitude)
       WHERE id=$7 AND landlord_id=$8
       RETURNING *`,
      [
        name || null,
        location || address || null,
        address || location || null,
        units || null,
        latitude || null,
        longitude || null,
        id,
        landlordId,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const updated = result.rows[0];
    await notifySavedSearchMatches({ landlordId, property: updated });
    res.json(updated);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePropertyLocation = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;
  const { latitude, longitude, address } = req.body;

  if (latitude == null || longitude == null) {
    return res.status(400).json({ message: 'latitude and longitude are required' });
  }

  try {
    const result = await pool.query(
      `UPDATE properties
       SET latitude=$1, longitude=$2, address=COALESCE($3, address)
       WHERE id=$4 AND landlord_id=$5
       RETURNING id, name, address, latitude, longitude`,
      [latitude, longitude, address || null, id, landlordId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteProperty = async (req, res) => {
  const landlordId = req.user.id;
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM properties WHERE id=$1 AND landlord_id=$2', [id, landlordId]);
    res.json({ message: 'Property deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
