const express = require('express');
const router = express.Router();
const {
  subscribe,
  subscriptionStatus,
  subscriptionCallback,
  cancelSubscription,
  getSubscriptionHistory,
} = require('../controllers/subscription.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireFields, oneOf, isPhoneLike } = require('../middleware/validation.middleware');

router.post(
  '/',
  verifyToken,
  checkRole('landlord'),
  requireFields(['plan_code', 'payment_method']),
  oneOf('plan_code', ['starter', 'pro', 'enterprise']),
  oneOf('billing_cycle', ['monthly', 'yearly']),
  oneOf('payment_method', ['mpesa', 'yas', 'airtel_money', 'halotel', 'nmb_bank', 'crdb_bank', 'tigo_pesa']),
  isPhoneLike('phone'),
  subscribe
);
router.get('/', verifyToken, subscriptionStatus);
router.get('/status', verifyToken, subscriptionStatus);
router.get('/history', verifyToken, getSubscriptionHistory);
router.post('/cancel', verifyToken, cancelSubscription);
router.post('/callback', subscriptionCallback);

module.exports = router;
