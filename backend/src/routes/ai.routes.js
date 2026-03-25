const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requirePlan } = require('../middleware/subscription.middleware');
const { getRentSuggestion, getRevenueForecast } = require('../controllers/ai.controller');

router.post('/rent-suggestion', verifyToken, checkRole('landlord'), requirePlan(['pro', 'enterprise']), getRentSuggestion);
router.get('/revenue-forecast', verifyToken, checkRole('landlord'), requirePlan(['pro', 'enterprise']), getRevenueForecast);

module.exports = router;
