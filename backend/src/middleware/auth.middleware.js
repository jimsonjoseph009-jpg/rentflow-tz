const jwt = require('jsonwebtoken');

exports.verifyToken = (req,res,next) => {
  const token = req.cookies?.token || (req.headers.authorization?.split(' ')[1]);
  if (!token) return res.status(401).json({ message:'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ message:'Invalid token or session expired' });
  }
};

// Middleware to allow either a valid JWT user OR a valid chat token (X-Chat-Token header)
exports.verifyUploadAccess = async (req, res, next) => {
  const token = req.cookies?.token || (req.headers.authorization?.split(' ')[1]);
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch {
      // If JWT fails, maybe they have a chat token?
    }
  }

  const chatToken = req.headers['x-chat-token'] || req.body?.chatToken;
  if (chatToken) {
    const pool = require('../config/db');
    const { rows } = await pool.query('SELECT 1 FROM tenant_chat_links WHERE token=$1 AND status=\'active\'', [chatToken]);
    if (rows.length > 0) {
      req.chatToken = chatToken;
      return next();
    }
  }

  return res.status(401).json({ message: 'Unauthorized upload' });
};

// For SSE/EventSource where headers can't be set; allow token via query string.
exports.verifyTokenQueryOrHeader = (req, res, next) => {
  const token =
    req.cookies?.token ||
    (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null) ||
    (req.query && req.query.token ? String(req.query.token) : null);

  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

exports.checkRole = (role) => (req,res,next) => {
  if (req.user.role !== role) return res.status(403).json({ message:'Access denied' });
  next();
};
