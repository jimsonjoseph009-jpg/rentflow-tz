const express = require('express');
const router = express.Router();
const { createInsuranceWarranty, getInsuranceWarranties, getInsuranceWarrantyById, updateInsuranceWarranty, deleteInsuranceWarranty, getExpiringRecords, getExpiredRecords, getRecordsByType } = require('../controllers/insuranceWarranty.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');

router.use(verifyToken, checkRole('landlord'), requireActiveSubscription);

router.post('/', createInsuranceWarranty);
router.get('/', getInsuranceWarranties);
router.get('/expiring', getExpiringRecords);
router.get('/expired', getExpiredRecords);
router.get('/type/:recordType', getRecordsByType);
router.get('/:id', getInsuranceWarrantyById);
router.put('/:id', updateInsuranceWarranty);
router.delete('/:id', deleteInsuranceWarranty);

module.exports = router;
