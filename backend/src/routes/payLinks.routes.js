const express = require('express');
const router = express.Router();

const { createPayLink } = require('../controllers/payLinks.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireFeature } = require('../middleware/subscription.middleware');
const { requireFields, isPositiveNumber } = require('../middleware/validation.middleware');

router.post(
  '/',
  verifyToken,
  checkRole('landlord'),
  requireFeature('payment_integration'),
  requireFields(['tenant_id', 'amount']),
  isPositiveNumber('amount'),
  createPayLink
);

module.exports = router;

