const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { registerClient, unregisterClient } = require('../services/notification.service');

const resolveUserFromRequest = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, process.env.JWT_SECRET);
  }
  if (req.query.token) {
    return jwt.verify(req.query.token, process.env.JWT_SECRET);
  }
  throw new Error('No token');
};

exports.streamNotifications = async (req, res) => {
  try {
    const user = resolveUserFromRequest(req);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const userId = user.id;
    registerClient(userId, res);

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, user_id: userId })}\n\n`);

    const keepAlive = setInterval(() => {
      res.write(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      unregisterClient(userId, res);
    });
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized stream' });
  }
};

exports.getNotifications = async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id=$1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.user.id, limit]
    );
    res.json(rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Notification not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to update notification' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1 AND is_read=false', [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to mark all as read' });
  }
};
