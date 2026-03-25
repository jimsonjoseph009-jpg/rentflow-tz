const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');
const {
  getMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
} = require('../controllers/maintenance.controller');

router.get('/', verifyToken, requireActiveSubscription, getMaintenanceRequests);
router.post('/', verifyToken, requireActiveSubscription, createMaintenanceRequest);
router.put('/:id', verifyToken, checkRole('landlord'), requireActiveSubscription, updateMaintenanceRequest);
router.delete('/:id', verifyToken, checkRole('landlord'), requireActiveSubscription, deleteMaintenanceRequest);

module.exports = router;
