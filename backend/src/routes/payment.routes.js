const express = require('express');
const router = express.Router();
const {
  createPayment,
  getPayments,
  updatePayment,
  deletePayment,
  payRent,
  paymentCallback,
  getPaymentHistory,
  getEarningsDashboard,
  runCollectionsAutomationNow,
  submitDirectRentPayment,
  approveDirectPayment,
} = require('../controllers/payment.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireFeature, requireActiveSubscription } = require('../middleware/subscription.middleware');
const { requireFields, isPositiveNumber, oneOf, isPhoneLike } = require('../middleware/validation.middleware');

router.post(
  '/pay',
  verifyToken,
  requireActiveSubscription,
  requireFeature('payment_integration'),
  requireFields(['tenant_id', 'amount', 'payment_method']),
  isPositiveNumber('amount'),
  oneOf('payment_method', ['mpesa', 'yas', 'airtel_money', 'nmb_bank', 'crdb_bank', 'tigo_pesa']),
  isPhoneLike('phone'),
  payRent
);
router.post('/callback', paymentCallback);
router.get('/history', verifyToken, getPaymentHistory);
router.get('/earnings', verifyToken, checkRole('landlord'), requireActiveSubscription, getEarningsDashboard);
router.post(
  '/collections/run',
  verifyToken,
  checkRole('landlord'),
  requireActiveSubscription,
  requireFeature('automated_reminders'),
  runCollectionsAutomationNow
);

router.post('/', verifyToken, checkRole('landlord'), requireActiveSubscription, createPayment);
router.get('/', verifyToken, checkRole('landlord'), requireActiveSubscription, getPayments);
router.put('/:id', verifyToken, checkRole('landlord'), requireActiveSubscription, updatePayment);
router.delete('/:id', verifyToken, checkRole('landlord'), requireActiveSubscription, deletePayment);

router.post('/direct', verifyToken, checkRole('tenant'), submitDirectRentPayment);
router.post('/:id/approve', verifyToken, checkRole('landlord'), requireActiveSubscription, approveDirectPayment);

module.exports = router;
