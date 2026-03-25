const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requirePlan } = require('../middleware/subscription.middleware');
const { askCopilot } = require('../controllers/copilot.controller');

router.post('/', verifyToken, checkRole('landlord'), requirePlan(['pro', 'enterprise']), askCopilot);

module.exports = router;
