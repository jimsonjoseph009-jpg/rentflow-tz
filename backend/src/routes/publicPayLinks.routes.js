const express = require('express');
const router = express.Router();

const { getPayLinkByToken, initiatePayLinkPayment } = require('../controllers/publicPayLinks.controller');
const { requireFields, oneOf, isPhoneLike } = require('../middleware/validation.middleware');

router.get('/:token', getPayLinkByToken);
router.post(
  '/:token/initiate',
  requireFields(['payment_method']),
  oneOf('payment_method', ['mpesa', 'yas', 'airtel_money', 'nmb_bank', 'crdb_bank', 'tigo_pesa']),
  isPhoneLike('phone'),
  initiatePayLinkPayment
);

module.exports = router;

