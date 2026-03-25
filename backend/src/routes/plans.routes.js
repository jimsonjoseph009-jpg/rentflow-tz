const express = require('express');
const router = express.Router();
const { getPlans } = require('../controllers/plans.controller');

router.get('/', getPlans);

module.exports = router;
