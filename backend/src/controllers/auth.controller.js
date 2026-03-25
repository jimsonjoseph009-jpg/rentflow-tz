const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

let avatarColumnKnown = null;

const checkAvatarColumn = async () => {
  try {
    const r = await pool.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema='public'
         AND table_name='users'
         AND column_name='avatar_url'
       LIMIT 1`
    );
    return r.rowCount > 0;
  } catch {
    return false;
  }
};

const hasAvatarColumn = async () => {
  if (avatarColumnKnown !== null) return avatarColumnKnown;
  avatarColumnKnown = await checkAvatarColumn();
  return avatarColumnKnown;
};

const ensureAvatarColumn = async () => {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;`);
    avatarColumnKnown = true;
  } catch (error) {
    // If the DB user cannot alter schema, we still allow the API to run without avatar support.
    console.warn('[auth] avatar_url column ensure skipped:', error.message);
    avatarColumnKnown = await checkAvatarColumn();
  }
};

const parseDataUrlImage = (dataUrl) => {
  const raw = String(dataUrl || '').trim();
  const match = raw.match(/^data:(image\/png|image\/jpeg|image\/webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return { mime: match[1], b64: match[2] };
};

exports.register = async (req, res) => {
  const { name, email, password, phone } = req.body;
  
  if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long and contain both letters and numbers' });
  }

  try {
    const userExists = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (userExists.rows.length) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      'INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING *',
      [name, email, hashed, 'landlord']
    );

    const userId = newUser.rows[0].id;
    await pool.query(
      'INSERT INTO landlords(user_id, phone, subscription_plan, subscription_status) VALUES($1,$2,$3,$4)',
      [userId, phone, 'trial', 'active']
    );

    await pool.query(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, billing_cycle, started_at, expires_at, updated_at)
       SELECT $1, p.id, 'trial', 'monthly', NOW(), NOW() + INTERVAL '14 days', NOW()
       FROM plans p
       WHERE p.code='starter'
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    res.status(201).json({ message: 'Landlord registered successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!user.rows.length) return res.status(400).json({ message: 'User not found' });

    const valid = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!valid) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.rows[0].id, role: user.rows[0].role, name: user.rows[0].name }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: { id: user.rows[0].id, name: user.rows[0].name, email: user.rows[0].email, role: user.rows[0].role },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.me = async (req, res) => {
  try {
    const withAvatar = await hasAvatarColumn();
    const userRes = await pool.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.role,
         ${withAvatar ? 'u.avatar_url' : 'NULL::text AS avatar_url'},
         u.whatsapp_number,
         lu.whatsapp_number AS landlord_whatsapp,
         l.phone AS landlord_phone,
         t.id AS tenant_id,
         t.phone AS tenant_phone,
         un.unit_number AS tenant_unit_number,
         pr.name AS tenant_property_name
       FROM users u
       LEFT JOIN landlords l ON l.user_id = u.id
       LEFT JOIN tenants t ON t.user_id = u.id
       LEFT JOIN units un ON t.unit_id = un.id
       LEFT JOIN properties pr ON un.property_id = pr.id
       LEFT JOIN users lu ON lu.id = pr.landlord_id
       WHERE u.id=$1`,
      [req.user.id]
    );

    if (!userRes.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(userRes.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  const { name, email, phone, whatsapp_number } = req.body;

  try {
    await pool.query(
      `UPDATE users
       SET name=COALESCE($1,name), email=COALESCE($2,email), whatsapp_number=COALESCE($3,whatsapp_number)
       WHERE id=$4`,
      [name || null, email || null, whatsapp_number !== undefined ? whatsapp_number : null, req.user.id]
    );

    if (phone !== undefined) {
      // Some DBs don't have a unique constraint on landlords.user_id, so avoid ON CONFLICT.
      const updated = await pool.query(`UPDATE landlords SET phone=$1 WHERE user_id=$2`, [phone, req.user.id]);
      if (updated.rowCount === 0) {
        await pool.query(
          `INSERT INTO landlords (user_id, phone, subscription_plan, subscription_status)
           VALUES ($1,$2,'trial','active')`,
          [req.user.id, phone]
        );
      }
    }

    const withAvatar = await hasAvatarColumn();
    const profileRes = await pool.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.role,
         ${withAvatar ? 'u.avatar_url' : 'NULL::text AS avatar_url'},
         u.whatsapp_number,
         l.phone AS landlord_phone
       FROM users u
       LEFT JOIN landlords l ON l.user_id = u.id
       WHERE u.id=$1`,
      [req.user.id]
    );

    if (!profileRes.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(profileRes.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateAvatar = async (req, res) => {
  const { image_base64 } = req.body || {};
  const parsed = parseDataUrlImage(image_base64);
  if (!parsed) {
    return res.status(400).json({ message: 'Invalid image. Use a PNG/JPEG/WebP data URL.' });
  }

  const buffer = Buffer.from(parsed.b64, 'base64');
  const maxBytes = 2 * 1024 * 1024; // 2MB
  if (!buffer.length || buffer.length > maxBytes) {
    return res.status(400).json({ message: 'Image too large. Max 2MB.' });
  }

  const hex = buffer.toString('hex', 0, 4).toUpperCase();
  const isPng = hex === '89504E47';
  const isJpeg = hex.startsWith('FFD8FF');
  const isWebp = hex === '52494646' && buffer.toString('utf8', 8, 12) === 'WEBP';

  if (!isPng && !isJpeg && !isWebp) {
    return res.status(400).json({ message: 'Spoofed file detected. Only authentic PNG/JPEG/WEBP binaries allowed.' });
  }

  const ext = parsed.mime === 'image/png' ? 'png' : parsed.mime === 'image/webp' ? 'webp' : 'jpg';
  const avatarsDir = path.join(__dirname, '../../storage/avatars');
  try {
    fs.mkdirSync(avatarsDir, { recursive: true });
  } catch {}

  const fileName = `avatar-${req.user.id}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}.${ext}`;
  const absolutePath = path.join(avatarsDir, fileName);
  const publicPath = `/avatars/${fileName}`;

  try {
    await ensureAvatarColumn();
    const withAvatar = await hasAvatarColumn();
    if (!withAvatar) {
      return res.status(503).json({ message: 'Avatar upload is not available (DB schema missing avatar_url).' });
    }
    fs.writeFileSync(absolutePath, buffer);

    await pool.query(`UPDATE users SET avatar_url=$1 WHERE id=$2`, [publicPath, req.user.id]);
    return res.status(200).json({ avatar_url: publicPath });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to update avatar' });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'currentPassword and newPassword are required' });
  }
  
  if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return res.status(400).json({ message: 'New password must be at least 8 characters long and contain letters and numbers' });
  }

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    if (!userRes.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userRes.rows[0];
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hashed, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ message: 'Logged out successfully' });
};

