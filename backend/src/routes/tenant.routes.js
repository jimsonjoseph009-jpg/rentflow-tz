const express = require('express');
const router = express.Router();
const {
  createTenant,
  getTenants,
  updateTenant,
  updateTenantLocation,
  deleteTenant,
} = require('../controllers/tenant.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');

// landlord‑scoped tenant API
router.post('/', verifyToken, checkRole('landlord'), requireActiveSubscription, createTenant);
router.get('/', verifyToken, checkRole('landlord'), requireActiveSubscription, getTenants);
router.put('/:id/location', verifyToken, checkRole('landlord'), requireActiveSubscription, updateTenantLocation);
router.put('/:id', verifyToken, checkRole('landlord'), requireActiveSubscription, updateTenant);
router.delete('/:id', verifyToken, checkRole('landlord'), requireActiveSubscription, deleteTenant);

module.exports = router;
