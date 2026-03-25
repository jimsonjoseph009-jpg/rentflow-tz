const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { getTenantTimeline, getPropertyTimeline } = require('../controllers/timeline.controller');

router.get('/tenant/:tenantId', verifyToken, checkRole('landlord'), getTenantTimeline);
router.get('/property/:propertyId', verifyToken, checkRole('landlord'), getPropertyTimeline);

module.exports = router;
