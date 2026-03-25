const express = require('express');
const router = express.Router();
const { createUtilityMeter, getUtilityMeters, getUtilityMeterById, updateUtilityMeter, deleteUtilityMeter, getMetersByType } = require('../controllers/utilityMeters.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');

router.use(verifyToken, checkRole('landlord'), requireActiveSubscription);

router.post('/', createUtilityMeter);
router.get('/', getUtilityMeters);
router.get('/type/:meterType', getMetersByType);
router.get('/:id', getUtilityMeterById);
router.put('/:id', updateUtilityMeter);
router.delete('/:id', deleteUtilityMeter);

module.exports = router;
