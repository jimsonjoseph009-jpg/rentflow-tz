const express = require('express');
const router = express.Router();
const { createTaxDeduction, getTaxDeductions, getTaxDeductionById, updateTaxDeduction, deleteTaxDeduction, getTaxSummary, getAnnualTaxSummary } = require('../controllers/taxDeductions.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');

router.use(verifyToken, checkRole('landlord'), requireActiveSubscription);

router.post('/', createTaxDeduction);
router.get('/', getTaxDeductions);
router.get('/summary', getTaxSummary);
router.get('/summary/:year', getAnnualTaxSummary);
router.get('/:id', getTaxDeductionById);
router.put('/:id', updateTaxDeduction);
router.delete('/:id', deleteTaxDeduction);

module.exports = router;
