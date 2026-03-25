const pool = require('../config/db');

const clients = new Map();

const registerClient = (userId, res) => {
  const key = String(userId);
  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key).add(res);
};

const unregisterClient = (userId, res) => {
  const key = String(userId);
  if (!clients.has(key)) return;
  clients.get(key).delete(res);
  if (clients.get(key).size === 0) clients.delete(key);
};

const emitToUser = (userId, event, payload) => {
  const key = String(userId);
  const subscribers = clients.get(key);
  if (!subscribers || !subscribers.size) return;

  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of subscribers) {
    res.write(data);
  }
};

const createNotification = async ({ userId, type = 'info', title, message, metadata = null }) => {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, metadata)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [userId, type, title, message, metadata ? JSON.stringify(metadata) : null]
  );

  const item = rows[0];
  emitToUser(userId, 'notification', item);
  return item;
};

module.exports = {
  registerClient,
  unregisterClient,
  emitToUser,
  createNotification,
};
