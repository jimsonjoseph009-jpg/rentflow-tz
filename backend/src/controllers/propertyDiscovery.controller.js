const pool = require('../config/db');
const { createNotification } = require('../services/notification.service');

const splitTokens = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const propertyMatchesQuery = (property, query) => {
  const tokens = splitTokens(query);
  if (!tokens.length) return true;
  const haystack = `${property.name || ''} ${property.address || ''} ${property.location || ''}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
};

const getLandlordProperties = async (landlordId) => {
  const { rows } = await pool.query(
    `SELECT id, name, address, location, units
     FROM properties
     WHERE landlord_id=$1`,
    [landlordId]
  );
  return rows;
};

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const toSearchResponse = (search, allProperties) => {
  const matches = allProperties.filter((property) => propertyMatchesQuery(property, search.query));
  const ids = matches.map((p) => p.id);
  const lastSeen = parseJsonArray(search.last_seen_property_ids).map(Number);
  const newCount = ids.filter((id) => !lastSeen.includes(Number(id))).length;
  return {
    ...search,
    match_count: matches.length,
    new_count: newCount,
    matched_property_ids: ids,
  };
};

exports.getFavorites = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const { rows } = await pool.query(
      `SELECT pf.property_id
       FROM property_favorites pf
       JOIN properties p ON p.id = pf.property_id
       WHERE pf.user_id=$1 AND p.landlord_id=$1
       ORDER BY pf.created_at DESC`,
      [landlordId]
    );
    res.json(rows.map((r) => r.property_id));
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to fetch favorites' });
  }
};

exports.addFavorite = async (req, res) => {
  const landlordId = req.user.id;
  const propertyId = Number(req.params.propertyId);
  if (!propertyId) return res.status(400).json({ message: 'Invalid propertyId' });

  try {
    const ownsProperty = await pool.query('SELECT id FROM properties WHERE id=$1 AND landlord_id=$2', [propertyId, landlordId]);
    if (!ownsProperty.rows.length) return res.status(404).json({ message: 'Property not found' });

    await pool.query(
      `INSERT INTO property_favorites (user_id, property_id)
       VALUES ($1,$2)
       ON CONFLICT (user_id, property_id) DO NOTHING`,
      [landlordId, propertyId]
    );

    res.json({ message: 'Property added to favorites', property_id: propertyId });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to save favorite' });
  }
};

exports.removeFavorite = async (req, res) => {
  const landlordId = req.user.id;
  const propertyId = Number(req.params.propertyId);
  if (!propertyId) return res.status(400).json({ message: 'Invalid propertyId' });

  try {
    await pool.query('DELETE FROM property_favorites WHERE user_id=$1 AND property_id=$2', [landlordId, propertyId]);
    res.json({ message: 'Favorite removed', property_id: propertyId });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to remove favorite' });
  }
};

exports.getSavedSearches = async (req, res) => {
  const landlordId = req.user.id;
  try {
    const [searchesRes, properties] = await Promise.all([
      pool.query(
        `SELECT id, user_id, name, query, sort_by, last_seen_property_ids, created_at, updated_at
         FROM saved_property_searches
         WHERE user_id=$1
         ORDER BY created_at DESC`,
        [landlordId]
      ),
      getLandlordProperties(landlordId),
    ]);

    const enriched = searchesRes.rows.map((search) => toSearchResponse(search, properties));
    res.json(enriched);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to fetch saved searches' });
  }
};

exports.createSavedSearch = async (req, res) => {
  const landlordId = req.user.id;
  const name = String(req.body.name || `Search ${Date.now()}`).trim();
  const query = String(req.body.query || '').trim();
  const sortBy = String(req.body.sort_by || req.body.sortBy || 'name_asc');

  try {
    const properties = await getLandlordProperties(landlordId);
    const matchedIds = properties.filter((property) => propertyMatchesQuery(property, query)).map((p) => p.id);

    const { rows } = await pool.query(
      `INSERT INTO saved_property_searches (user_id, name, query, sort_by, last_seen_property_ids)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [landlordId, name, query, sortBy, JSON.stringify(matchedIds)]
    );

    res.status(201).json(toSearchResponse(rows[0], properties));
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to create saved search' });
  }
};

exports.deleteSavedSearch = async (req, res) => {
  const landlordId = req.user.id;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });

  try {
    const { rows } = await pool.query(
      `DELETE FROM saved_property_searches
       WHERE id=$1 AND user_id=$2
       RETURNING *`,
      [id, landlordId]
    );

    if (!rows.length) return res.status(404).json({ message: 'Saved search not found' });
    res.json({ message: 'Saved search removed' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to remove saved search' });
  }
};

exports.markSavedSearchSeen = async (req, res) => {
  const landlordId = req.user.id;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });

  try {
    const searchRes = await pool.query(
      `SELECT * FROM saved_property_searches WHERE id=$1 AND user_id=$2`,
      [id, landlordId]
    );
    if (!searchRes.rows.length) return res.status(404).json({ message: 'Saved search not found' });
    const search = searchRes.rows[0];

    const properties = await getLandlordProperties(landlordId);
    const matchedIds = properties.filter((property) => propertyMatchesQuery(property, search.query)).map((p) => p.id);

    const { rows } = await pool.query(
      `UPDATE saved_property_searches
       SET last_seen_property_ids=$1, updated_at=NOW()
       WHERE id=$2 AND user_id=$3
       RETURNING *`,
      [JSON.stringify(matchedIds), id, landlordId]
    );

    res.json(toSearchResponse(rows[0], properties));
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to mark search as seen' });
  }
};

exports.notifySavedSearchMatches = async ({ landlordId, property }) => {
  try {
    const searchRes = await pool.query(
      `SELECT * FROM saved_property_searches WHERE user_id=$1`,
      [landlordId]
    );

    for (const search of searchRes.rows) {
      if (!propertyMatchesQuery(property, search.query)) continue;

      const alreadyLogged = await pool.query(
        `SELECT id FROM property_search_alert_logs
         WHERE user_id=$1 AND search_id=$2 AND property_id=$3`,
        [landlordId, search.id, property.id]
      );
      if (alreadyLogged.rows.length) continue;

      await createNotification({
        userId: landlordId,
        type: 'info',
        title: 'New Property Match',
        message: `"${property.name}" matched your saved search "${search.name}".`,
        metadata: {
          search_id: search.id,
          property_id: property.id,
          query: search.query,
        },
      });

      await pool.query(
        `INSERT INTO property_search_alert_logs (user_id, search_id, property_id)
         VALUES ($1,$2,$3)`,
        [landlordId, search.id, property.id]
      );
    }
  } catch (error) {
    console.warn('[saved-search-notify] skipped:', error.message);
  }
};

