const express = require('express');
const router = express.Router();
const {
  createUnit,
  getUnits,
  updateUnit,
  deleteUnit,
} = require('../controllers/unit.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription, enforceQuotaLimit } = require('../middleware/subscription.middleware');

// all unit endpoints are landlord‑scoped
router.post('/', verifyToken, checkRole('landlord'), requireActiveSubscription, enforceQuotaLimit('units'), createUnit);
router.get('/', verifyToken, checkRole('landlord'), requireActiveSubscription, getUnits);
router.put('/:id', verifyToken, checkRole('landlord'), requireActiveSubscription, updateUnit);
router.delete('/:id', verifyToken, checkRole('landlord'), requireActiveSubscription, deleteUnit);

module.exports = router;
