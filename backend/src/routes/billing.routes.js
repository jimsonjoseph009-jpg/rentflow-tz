const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { getBillingHistory, getTransactionFees, getSmsUsage } = require('../controllers/billing.controller');

router.get('/billing-history', verifyToken, checkRole('landlord'), getBillingHistory);
router.get('/transaction-fees', verifyToken, checkRole('landlord'), getTransactionFees);
router.get('/sms-usage', verifyToken, checkRole('landlord'), getSmsUsage);

module.exports = router;
