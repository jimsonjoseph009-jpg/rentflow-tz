const pool = require('../config/db');
const { ensureOptionalTables } = require('../services/schemaBootstrap.service');

const ALLOWED_CATEGORY = ['house', 'hostel', 'apartment', 'airbnb'];
const ALLOWED_LISTING_TYPE = ['rent', 'sale', 'short_stay'];
const ALLOWED_MEDIA_TYPE = ['image', 'video'];

const normalize = (value) => String(value || '').trim().toLowerCase();

exports.getPublicListings = async (_req, res) => {
  try {
    await ensureOptionalTables();

    const result = await pool.query(
      `SELECT ml.*, u.name AS landlord_name
       FROM marketplace_listings ml
       JOIN users u ON u.id = ml.landlord_id
       WHERE ml.is_active = true
       ORDER BY ml.created_at DESC
       LIMIT 200`
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to load marketplace listings' });
  }
};

exports.getMyListings = async (req, res) => {
  try {
    await ensureOptionalTables();

    const result = await pool.query(
      `SELECT *
       FROM marketplace_listings
       WHERE landlord_id=$1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to load your listings' });
  }
};

exports.createListing = async (req, res) => {
  try {
    await ensureOptionalTables();

    const {
      title,
      description,
      category = 'apartment',
      listing_type = 'rent',
      price_tzs = 0,
      location = null,
      media_type = 'image',
      media_url = null,
      is_active = true,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'title is required' });
    }

    const safeCategory = ALLOWED_CATEGORY.includes(normalize(category)) ? normalize(category) : 'apartment';
    const safeListingType = ALLOWED_LISTING_TYPE.includes(normalize(listing_type)) ? normalize(listing_type) : 'rent';
    const safeMediaType = ALLOWED_MEDIA_TYPE.includes(normalize(media_type)) ? normalize(media_type) : 'image';

    const result = await pool.query(
      `INSERT INTO marketplace_listings (
        landlord_id, title, description, category, listing_type, price_tzs, location, media_type, media_url, is_active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        req.user.id,
        title,
        description || null,
        safeCategory,
        safeListingType,
        Number(price_tzs || 0),
        location || null,
        safeMediaType,
        media_url || null,
        Boolean(is_active),
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[Marketplace Error]:', error.message);
    return res.status(500).json({ 
      message: 'Failed to create listing', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

exports.updateListing = async (req, res) => {
  try {
    await ensureOptionalTables();

    const { id } = req.params;
    const {
      title,
      description,
      category,
      listing_type,
      price_tzs,
      location,
      media_type,
      media_url,
      is_active,
    } = req.body;

    const safeCategory = category ? (ALLOWED_CATEGORY.includes(normalize(category)) ? normalize(category) : null) : null;
    const safeListingType = listing_type
      ? (ALLOWED_LISTING_TYPE.includes(normalize(listing_type)) ? normalize(listing_type) : null)
      : null;
    const safeMediaType = media_type ? (ALLOWED_MEDIA_TYPE.includes(normalize(media_type)) ? normalize(media_type) : null) : null;

    const result = await pool.query(
      `UPDATE marketplace_listings
       SET title=COALESCE($1, title),
           description=COALESCE($2, description),
           category=COALESCE($3, category),
           listing_type=COALESCE($4, listing_type),
           price_tzs=COALESCE($5, price_tzs),
           location=COALESCE($6, location),
           media_type=COALESCE($7, media_type),
           media_url=COALESCE($8, media_url),
           is_active=COALESCE($9, is_active),
           updated_at=NOW()
       WHERE id=$10 AND landlord_id=$11
       RETURNING *`,
      [
        title || null,
        description || null,
        safeCategory,
        safeListingType,
        price_tzs == null ? null : Number(price_tzs),
        location || null,
        safeMediaType,
        media_url || null,
        is_active == null ? null : Boolean(is_active),
        id,
        req.user.id,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('[Marketplace Update Error]:', error.message);
    return res.status(500).json({ 
      message: 'Failed to update listing', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    await ensureOptionalTables();

    const result = await pool.query(
      'DELETE FROM marketplace_listings WHERE id=$1 AND landlord_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    return res.json({ message: 'Listing deleted' });
  } catch (error) {
    console.error('[Marketplace Delete Error]:', error.message);
    return res.status(500).json({ 
      message: 'Failed to delete listing', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};
