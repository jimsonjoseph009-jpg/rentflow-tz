const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { getMetrics } = require('../controllers/metrics.controller');

router.get('/', verifyToken, checkRole('admin'), getMetrics);

module.exports = router;
