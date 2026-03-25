const express = require('express');
const router = express.Router();
const { getDashboard } = require('../controllers/dashboard.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');

// Protected route - only landlords
router.get('/', verifyToken, checkRole('landlord'), requireActiveSubscription, getDashboard);

module.exports = router;
