const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireFields, oneOf, isPositiveNumber, isPhoneLike } = require('../middleware/validation.middleware');
const {
  requestEnterprisePlan,
  getEnterpriseClients,
  updateEnterpriseClient,
} = require('../controllers/enterprise.controller');

router.post(
  '/request',
  verifyToken,
  checkRole('landlord'),
  requireFields(['company_name']),
  isPhoneLike('contact_phone'),
  requestEnterprisePlan
);
router.get('/clients', verifyToken, checkRole('admin'), getEnterpriseClients);
router.put(
  '/clients/:id',
  verifyToken,
  checkRole('admin'),
  oneOf('status', ['lead', 'active', 'inactive']),
  isPositiveNumber('negotiated_price'),
  updateEnterpriseClient
);

module.exports = router;
