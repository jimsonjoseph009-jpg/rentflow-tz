const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  streamNotifications,
  getNotifications,
  markNotificationRead,
  markAllRead,
} = require('../controllers/notifications.controller');

router.get('/stream', streamNotifications);
router.get('/', verifyToken, getNotifications);
router.put('/:id/read', verifyToken, markNotificationRead);
router.put('/read-all', verifyToken, markAllRead);

module.exports = router;
