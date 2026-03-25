const express = require('express');
const router = express.Router();
const { createQRInspection, getQRInspections, getQRInspectionById, updateQRInspection, deleteQRInspection, getInspectionsByProperty, getInspectionsByCondition } = require('../controllers/qrInspections.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');

router.use(verifyToken, checkRole('landlord'), requireActiveSubscription);

router.post('/', createQRInspection);
router.get('/', getQRInspections);
router.get('/property/:propertyId', getInspectionsByProperty);
router.get('/condition/:condition', getInspectionsByCondition);
router.get('/:id', getQRInspectionById);
router.put('/:id', updateQRInspection);
router.delete('/:id', deleteQRInspection);

module.exports = router;
