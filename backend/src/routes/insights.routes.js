const express = require('express');
const router = express.Router();
const { getCommandCenter } = require('../controllers/insights.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');

router.get('/command-center', verifyToken, checkRole('landlord'), getCommandCenter);

module.exports = router;
