const crypto = require('crypto');
const pool = require('../config/db');
const { ensureOptionalTables } = require('../services/schemaBootstrap.service');
const {
  registerChatClient,
  unregisterChatClient,
  broadcastChatEvent,
} = require('../services/chatStream.service');

const clampLimit = (value, fallback, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

const chatKey = (role, userId) => `${role}:${userId}`;

const emitMessage = ({ landlordId, tenantUserId, payload }) => {
  if (landlordId) broadcastChatEvent(chatKey('landlord', landlordId), 'message', payload);
  if (tenantUserId) broadcastChatEvent(chatKey('tenant', tenantUserId), 'message', payload);
};

const isExpired = (expiresAt) => {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
};

const getOrCreateThread = async ({ landlordId, tenantId }) => {
  const existing = await pool.query(
    `SELECT id FROM chat_threads WHERE landlord_id=$1 AND tenant_id=$2 LIMIT 1`,
    [landlordId, tenantId]
  );
  if (existing.rows.length) return existing.rows[0].id;

  const created = await pool.query(
    `INSERT INTO chat_threads (landlord_id, tenant_id, last_message_at)
     VALUES ($1,$2,NOW())
     ON CONFLICT (landlord_id, tenant_id)
     DO UPDATE SET landlord_id=EXCLUDED.landlord_id
     RETURNING id`,
    [landlordId, tenantId]
  );
  return created.rows[0].id;
};

exports.listThreads = async (req, res) => {
  const landlordId = req.user.id;
  try {
    await ensureOptionalTables();

    const { rows } = await pool.query(
      `SELECT
         th.id,
         th.tenant_id,
         th.last_message_at,
         t.full_name AS tenant_name,
         t.phone AS tenant_phone,
         (
           SELECT m.body
           FROM chat_messages m
           WHERE m.thread_id = th.id
           ORDER BY m.created_at DESC, m.id DESC
           LIMIT 1
         ) AS last_message
       FROM chat_threads th
       JOIN tenants t ON th.tenant_id=t.id
       WHERE th.landlord_id=$1
       ORDER BY COALESCE(th.last_message_at, th.created_at) DESC, th.id DESC`,
      [landlordId]
    );

    return res.json(rows);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to load threads' });
  }
};

exports.streamChat = async (req, res) => {
  const user = req.user;
  if (!user || !user.id || !user.role) return res.status(401).json({ message: 'Unauthorized stream' });
  if (!['landlord', 'tenant'].includes(user.role)) return res.status(403).json({ message: 'Access denied' });

  try {
    await ensureOptionalTables();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const key = chatKey(user.role, user.id);
    registerChatClient(key, res);

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, role: user.role, user_id: user.id })}\n\n`);

    const keepAlive = setInterval(() => {
      res.write(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      unregisterChatClient(key, res);
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to open chat stream' });
  }
};

exports.getThreadWithMessages = async (req, res) => {
  const landlordId = req.user.id;
  const tenantId = Number(req.params.tenantId);
  const limit = clampLimit(req.query.limit, 60, 200);
  if (!Number.isFinite(tenantId) || tenantId <= 0) return res.status(400).json({ message: 'Invalid tenant id' });

  try {
    await ensureOptionalTables();

    // Ensure tenant belongs to landlord.
    const tenantRes = await pool.query(
      `SELECT t.id, t.full_name
       FROM tenants t
       JOIN units u ON t.unit_id=u.id
       JOIN properties p ON u.property_id=p.id
       WHERE t.id=$1 AND p.landlord_id=$2
       LIMIT 1`,
      [tenantId, landlordId]
    );
    if (!tenantRes.rows.length) return res.status(404).json({ message: 'Tenant not found' });

    const threadId = await getOrCreateThread({ landlordId, tenantId });

    const messagesRes = await pool.query(
      `SELECT id, sender_type, body, media_url, media_type, created_at
       FROM chat_messages
       WHERE thread_id=$1
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [threadId, limit]
    );

    const messages = messagesRes.rows.reverse();
    return res.json({
      thread: { id: threadId, tenant_id: tenantId, tenant_name: tenantRes.rows[0].full_name },
      messages,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to load thread' });
  }
};

exports.sendLandlordMessage = async (req, res) => {
  const landlordId = req.user.id;
  const threadId = Number(req.params.threadId);
  const { body, media_url, media_type } = req.body || {};
  const text = String(body || '').trim();

  if (!Number.isFinite(threadId) || threadId <= 0) return res.status(400).json({ message: 'Invalid thread id' });
  if (!text && !media_url) return res.status(400).json({ message: 'Message body or media is required' });
  if (text.length > 2000) return res.status(400).json({ message: 'Message too long' });

  try {
    await ensureOptionalTables();

    const threadRes = await pool.query(
      `SELECT id FROM chat_threads WHERE id=$1 AND landlord_id=$2 LIMIT 1`,
      [threadId, landlordId]
    );
    if (!threadRes.rows.length) return res.status(404).json({ message: 'Thread not found' });

    const msgRes = await pool.query(
      `INSERT INTO chat_messages (thread_id, sender_type, body, media_url, media_type)
       VALUES ($1,'landlord',$2,$3,$4)
       RETURNING id, sender_type, body, media_url, media_type, created_at`,
      [threadId, text || null, media_url || null, media_type || null]
    );

    await pool.query(`UPDATE chat_threads SET last_message_at=NOW() WHERE id=$1`, [threadId]);

    // Emit realtime event to landlord + tenant (if tenant has a linked user account).
    const ctxRes = await pool.query(
      `SELECT th.landlord_id, th.tenant_id, t.user_id AS tenant_user_id
       FROM chat_threads th
       JOIN tenants t ON th.tenant_id=t.id
       WHERE th.id=$1 AND th.landlord_id=$2
       LIMIT 1`,
      [threadId, landlordId]
    );
    const ctx = ctxRes.rows[0] || null;
    emitMessage({
      landlordId,
      tenantUserId: ctx?.tenant_user_id || null,
      payload: {
        thread_id: threadId,
        landlord_id: landlordId,
        tenant_id: ctx?.tenant_id || null,
        tenant_user_id: ctx?.tenant_user_id || null,
        ...msgRes.rows[0],
      },
    });

    return res.status(201).json(msgRes.rows[0]);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to send message' });
  }
};

exports.createTenantChatLink = async (req, res) => {
  const landlordId = req.user.id;
  const { tenant_id, expires_in_days } = req.body || {};
  const tenantId = Number(tenant_id);
  const days = expires_in_days == null ? 30 : Number(expires_in_days);

  if (!Number.isFinite(tenantId) || tenantId <= 0) return res.status(400).json({ message: 'tenant_id is required' });
  if (!Number.isFinite(days) || days < 1 || days > 365) return res.status(400).json({ message: 'expires_in_days must be between 1 and 365' });

  try {
    await ensureOptionalTables();

    const tenantRes = await pool.query(
      `SELECT t.id
       FROM tenants t
       JOIN units u ON t.unit_id=u.id
       JOIN properties p ON u.property_id=p.id
       WHERE t.id=$1 AND p.landlord_id=$2
       LIMIT 1`,
      [tenantId, landlordId]
    );
    if (!tenantRes.rows.length) return res.status(404).json({ message: 'Tenant not found' });

    const threadId = await getOrCreateThread({ landlordId, tenantId });
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const linkRes = await pool.query(
      `INSERT INTO tenant_chat_links (token, thread_id, expires_at)
       VALUES ($1,$2,$3)
       RETURNING token, status, created_at, expires_at`,
      [token, threadId, expiresAt]
    );

    const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
    const public_url = `${frontendBase.replace(/\/$/, '')}/chat/${token}`;
    return res.status(201).json({ ...linkRes.rows[0], thread_id: threadId, public_url });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to create chat link' });
  }
};

exports.getPublicChatByToken = async (req, res) => {
  const token = String(req.params.token || '').trim();
  const limit = clampLimit(req.query.limit, 60, 200);
  if (!token) return res.status(400).json({ message: 'Token required' });

  try {
    await ensureOptionalTables();

    const linkRes = await pool.query(
      `SELECT l.token, l.status, l.expires_at, th.id AS thread_id, th.tenant_id, th.landlord_id,
              t.full_name AS tenant_name, p.name AS property_name
       FROM tenant_chat_links l
       JOIN chat_threads th ON l.thread_id=th.id
       JOIN tenants t ON th.tenant_id=t.id
       JOIN units u ON t.unit_id=u.id
       JOIN properties p ON u.property_id=p.id
       WHERE l.token=$1
       LIMIT 1`,
      [token]
    );

    if (!linkRes.rows.length) return res.status(404).json({ message: 'Chat link not found' });
    const link = linkRes.rows[0];
    if (link.status !== 'active') return res.status(410).json({ message: 'Chat link inactive' });
    if (isExpired(link.expires_at)) return res.status(410).json({ message: 'Chat link expired' });

    const messagesRes = await pool.query(
      `SELECT id, sender_type, body, media_url, media_type, created_at
       FROM chat_messages
       WHERE thread_id=$1
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [link.thread_id, limit]
    );

    return res.json({
      thread: {
        id: link.thread_id,
        tenant_name: link.tenant_name,
        property_name: link.property_name,
      },
      messages: messagesRes.rows.reverse(),
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to load chat' });
  }
};

exports.sendTenantMessageByToken = async (req, res) => {
  const token = String(req.params.token || '').trim();
  const { body, media_url, media_type } = req.body || {};
  const text = String(body || '').trim();

  if (!token) return res.status(400).json({ message: 'Token required' });
  if (!text && !media_url) return res.status(400).json({ message: 'Message body or media is required' });
  if (text.length > 2000) return res.status(400).json({ message: 'Message too long' });

  try {
    await ensureOptionalTables();

    const linkRes = await pool.query(
      `SELECT l.status, l.expires_at, th.id AS thread_id
       FROM tenant_chat_links l
       JOIN chat_threads th ON l.thread_id=th.id
       WHERE l.token=$1
       LIMIT 1`,
      [token]
    );

    if (!linkRes.rows.length) return res.status(404).json({ message: 'Chat link not found' });
    const link = linkRes.rows[0];
    if (link.status !== 'active') return res.status(410).json({ message: 'Chat link inactive' });
    if (isExpired(link.expires_at)) return res.status(410).json({ message: 'Chat link expired' });

    const msgRes = await pool.query(
      `INSERT INTO chat_messages (thread_id, sender_type, body, media_url, media_type)
       VALUES ($1,'tenant',$2,$3,$4)
       RETURNING id, sender_type, body, media_url, media_type, created_at`,
      [link.thread_id, text || null, media_url || null, media_type || null]
    );

    await pool.query(`UPDATE chat_threads SET last_message_at=NOW() WHERE id=$1`, [link.thread_id]);

    // Emit realtime event to landlord + tenant (if tenant has a linked user account).
    const ctxRes = await pool.query(
      `SELECT th.landlord_id, th.tenant_id, t.user_id AS tenant_user_id
       FROM tenant_chat_links l
       JOIN chat_threads th ON l.thread_id=th.id
       JOIN tenants t ON th.tenant_id=t.id
       WHERE l.token=$1
       LIMIT 1`,
      [token]
    );
    const ctx = ctxRes.rows[0] || null;
    emitMessage({
      landlordId: ctx?.landlord_id || null,
      tenantUserId: ctx?.tenant_user_id || null,
      payload: {
        thread_id: link.thread_id,
        landlord_id: ctx?.landlord_id || null,
        tenant_id: ctx?.tenant_id || null,
        tenant_user_id: ctx?.tenant_user_id || null,
        ...msgRes.rows[0],
      },
    });

    return res.status(201).json(msgRes.rows[0]);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to send message' });
  }
};

const getTenantContextByUserId = async (userId) => {
  const { rows } = await pool.query(
    `SELECT
       t.id AS tenant_id,
       t.full_name AS tenant_name,
       u.id AS unit_id,
       u.unit_number,
       p.id AS property_id,
       p.name AS property_name,
       p.landlord_id,
       lu.name AS landlord_name
     FROM tenants t
     JOIN units u ON t.unit_id=u.id
     JOIN properties p ON u.property_id=p.id
     JOIN users lu ON p.landlord_id=lu.id
     WHERE t.user_id=$1
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

exports.getTenantThread = async (req, res) => {
  const userId = req.user.id;
  try {
    await ensureOptionalTables();

    const ctx = await getTenantContextByUserId(userId);
    if (!ctx) return res.status(404).json({ message: 'Tenant profile not linked' });

    const threadId = await getOrCreateThread({ landlordId: ctx.landlord_id, tenantId: ctx.tenant_id });
    return res.json({
      thread: {
        id: threadId,
        tenant_id: ctx.tenant_id,
        landlord_id: ctx.landlord_id,
        landlord_name: ctx.landlord_name,
        property_name: ctx.property_name,
        unit_number: ctx.unit_number,
      },
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to load tenant thread' });
  }
};

exports.getTenantMessages = async (req, res) => {
  const userId = req.user.id;
  const limit = clampLimit(req.query.limit, 80, 200);
  try {
    await ensureOptionalTables();

    const ctx = await getTenantContextByUserId(userId);
    if (!ctx) return res.status(404).json({ message: 'Tenant profile not linked' });

    const threadId = await getOrCreateThread({ landlordId: ctx.landlord_id, tenantId: ctx.tenant_id });
    const messagesRes = await pool.query(
      `SELECT id, sender_type, body, media_url, media_type, created_at
       FROM chat_messages
       WHERE thread_id=$1
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [threadId, limit]
    );

    return res.json({
      thread: {
        id: threadId,
        landlord_name: ctx.landlord_name,
        property_name: ctx.property_name,
        unit_number: ctx.unit_number,
      },
      messages: messagesRes.rows.reverse(),
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to load messages' });
  }
};

exports.sendTenantMessage = async (req, res) => {
  const userId = req.user.id;
  const { body, media_url, media_type } = req.body || {};
  const text = String(body || '').trim();
  if (!text && !media_url) return res.status(400).json({ message: 'Message body or media is required' });
  if (text.length > 2000) return res.status(400).json({ message: 'Message too long' });

  try {
    await ensureOptionalTables();

    const ctx = await getTenantContextByUserId(userId);
    if (!ctx) return res.status(404).json({ message: 'Tenant profile not linked' });

    const threadId = await getOrCreateThread({ landlordId: ctx.landlord_id, tenantId: ctx.tenant_id });
    const msgRes = await pool.query(
      `INSERT INTO chat_messages (thread_id, sender_type, body, media_url, media_type)
       VALUES ($1,'tenant',$2,$3,$4)
       RETURNING id, sender_type, body, media_url, media_type, created_at`,
      [threadId, text || null, media_url || null, media_type || null]
    );

    await pool.query(`UPDATE chat_threads SET last_message_at=NOW() WHERE id=$1`, [threadId]);

    emitMessage({
      landlordId: ctx.landlord_id,
      tenantUserId: userId,
      payload: {
        thread_id: threadId,
        landlord_id: ctx.landlord_id,
        tenant_id: ctx.tenant_id,
        tenant_user_id: userId,
        ...msgRes.rows[0],
      },
    });
    return res.status(201).json(msgRes.rows[0]);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to send message' });
  }
};

const fs = require('fs');
const path = require('path');

exports.uploadChatMedia = async (req, res) => {
  const userId = req.user?.id || 'guest';
  const chatToken = req.chatToken || 'no-token';
  const dataUrl = String(req.body?.dataUrl || req.body?.data_url || '').trim();

  if (!dataUrl) return res.status(400).json({ message: 'dataUrl is required' });
  if (!dataUrl.startsWith('data:')) return res.status(400).json({ message: 'Invalid dataUrl format' });
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) return res.status(400).json({ message: 'Invalid dataUrl' });

  const header = dataUrl.slice(5, commaIdx);
  if (!header.includes('base64')) return res.status(400).json({ message: 'dataUrl must be base64 encoded' });
  const mime = header.split(';')[0];
  const b64 = dataUrl.slice(commaIdx + 1);

  let buf;
  try {
    buf = Buffer.from(b64, 'base64');
  } catch {
    return res.status(400).json({ message: 'Invalid base64 payload' });
  }

  const maxBytes = 25 * 1024 * 1024; // 25MB for chat media
  if (buf.length > maxBytes) {
    return res.status(413).json({ message: 'File too large (max 25MB)' });
  }

  const hex = buf.toString('hex', 0, 4).toUpperCase();
  const isWebm = hex === '1A45DFA3';
  const isOgg = hex === '4F676753';
  const isMp4 = buf.toString('utf8', 4, 8) === 'ftyp';
  const isWav = hex === '52494646' && buf.toString('utf8', 8, 12) === 'WAVE';
  const isJpeg = hex === 'FFD8FF';
  const isPng = hex === '89504E47';
  const isGif = hex === '47494638';

  if (!isWebm && !isOgg && !isMp4 && !isWav && !isJpeg && !isPng && !isGif) {
    return res.status(400).json({ message: 'Unsupported file type. Allowed: Images (JPG, PNG, GIF), Videos (MP4, WebM), Audio (WAV, OGG).' });
  }

  let ext = 'bin';
  if (isJpeg) ext = 'jpg';
  else if (isPng) ext = 'png';
  else if (isGif) ext = 'gif';
  else if (isMp4) ext = 'mp4';
  else if (isWebm) ext = 'webm';
  else if (isOgg) ext = 'ogg';
  else if (isWav) ext = 'wav';

  const identifier = req.user?.id ? `u${req.user.id}` : `t${chatToken.slice(0, 8)}`;
  const filename = `chat_${identifier}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const dir = path.join(__dirname, '../../storage/chat-media');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buf);

  const apiBase = (process.env.API_PUBLIC_URL || 'http://localhost:5000').replace(/\/$/, '');
  const media_url = `${apiBase}/chat-media/${filename}`;
  const media_type = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : 'audio';

  return res.status(201).json({ media_url, media_type, mime, size: buf.length });
};
