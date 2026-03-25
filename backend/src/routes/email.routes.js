const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const {
  sendRentReminder,
  sendPaymentReceipt,
  sendLeaseExpiration,
  sendMaintenanceNotification,
  sendInvoice,
  sendBulk,
  sendWelcome,
  scheduleEmail,
} = require('../controllers/email.controller');

router.post('/send-rent-reminder', verifyToken, checkRole('landlord'), sendRentReminder);
router.post('/send-payment-receipt', verifyToken, checkRole('landlord'), sendPaymentReceipt);
router.post('/send-lease-expiration', verifyToken, checkRole('landlord'), sendLeaseExpiration);
router.post('/send-maintenance-notification', verifyToken, checkRole('landlord'), sendMaintenanceNotification);
router.post('/send-welcome', verifyToken, checkRole('landlord'), sendWelcome);
router.post('/send-invoice', verifyToken, checkRole('landlord'), sendInvoice);
router.post('/send-bulk', verifyToken, checkRole('landlord'), sendBulk);
router.post('/schedule', verifyToken, checkRole('landlord'), scheduleEmail);

module.exports = router;
