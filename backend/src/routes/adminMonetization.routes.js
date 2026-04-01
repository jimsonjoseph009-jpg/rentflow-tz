const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { getAdminMonetizationDashboard, getMonetizationDetails } = require('../controllers/adminMonetization.controller');

router.get('/monetization', verifyToken, checkRole('admin'), getAdminMonetizationDashboard);
router.get('/monetization/details/:type', verifyToken, checkRole('admin'), getMonetizationDetails);

module.exports = router;
