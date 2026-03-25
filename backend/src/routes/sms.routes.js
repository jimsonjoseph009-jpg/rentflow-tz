const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');
const { sendSmsNotification } = require('../controllers/sms.controller');
const { requireFields, oneOf, isPhoneLike } = require('../middleware/validation.middleware');

router.post(
  '/send',
  verifyToken,
  checkRole('landlord'),
  requireActiveSubscription,
  requireFields(['recipient_phone', 'message']),
  isPhoneLike('recipient_phone'),
  oneOf('sms_type', ['rent_reminder', 'payment_confirmation', 'lease_expiry', 'other']),
  sendSmsNotification
);

module.exports = router;
