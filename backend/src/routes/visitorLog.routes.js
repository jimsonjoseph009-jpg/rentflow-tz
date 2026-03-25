const express = require('express');
const router = express.Router();
const { createVisitorLog, getVisitorLogs, getVisitorLogById, updateVisitorLog, deleteVisitorLog, getVisitorsByProperty } = require('../controllers/visitorLog.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');

router.use(verifyToken, requireActiveSubscription);

router.post('/', createVisitorLog);
router.get('/', getVisitorLogs);
router.get('/property/:propertyId', getVisitorsByProperty);
router.get('/:id', getVisitorLogById);
router.put('/:id', checkRole('landlord'), updateVisitorLog);
router.delete('/:id', checkRole('landlord'), deleteVisitorLog);

module.exports = router;
