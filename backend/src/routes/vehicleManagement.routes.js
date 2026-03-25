const express = require('express');
const router = express.Router();
const { createVehicle, getVehicles, getVehicleById, updateVehicle, deleteVehicle, getVehiclesByType, getTenantVehicles } = require('../controllers/vehicleManagement.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');

router.use(verifyToken, checkRole('landlord'), requireActiveSubscription);

router.post('/', createVehicle);
router.get('/', getVehicles);
router.get('/type/:vehicleType', getVehiclesByType);
router.get('/tenant/:tenantId', getTenantVehicles);
router.get('/:id', getVehicleById);
router.put('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

module.exports = router;
