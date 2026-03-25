const express = require('express');
const router = express.Router();
const { createPaymentAlert, getPaymentAlerts, getPaymentAlertById, updatePaymentAlert, deletePaymentAlert, getOverdueAlerts } = require('../controllers/paymentAlerts.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireFeature } = require('../middleware/subscription.middleware');

router.post('/', verifyToken, checkRole('landlord'), requireFeature('automated_reminders'), createPaymentAlert);
router.get('/', verifyToken, checkRole('landlord'), requireFeature('automated_reminders'), getPaymentAlerts);
router.get('/overdue', verifyToken, checkRole('landlord'), requireFeature('automated_reminders'), getOverdueAlerts);
router.get('/:id', verifyToken, checkRole('landlord'), requireFeature('automated_reminders'), getPaymentAlertById);
router.put('/:id', verifyToken, checkRole('landlord'), requireFeature('automated_reminders'), updatePaymentAlert);
router.delete('/:id', verifyToken, checkRole('landlord'), requireFeature('automated_reminders'), deletePaymentAlert);

module.exports = router;
