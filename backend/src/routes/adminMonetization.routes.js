const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { getAdminMonetizationDashboard } = require('../controllers/adminMonetization.controller');

router.get('/monetization', verifyToken, checkRole('admin'), getAdminMonetizationDashboard);

module.exports = router;
