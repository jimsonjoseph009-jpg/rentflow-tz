const express = require('express');
const router = express.Router();
const { getPaymentMethods, addPaymentMethod, deletePaymentMethod } = require('../controllers/paymentMethods.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');

router.get('/', verifyToken, getPaymentMethods);
router.post('/', verifyToken, checkRole('landlord'), addPaymentMethod);
router.delete('/:id', verifyToken, checkRole('landlord'), deletePaymentMethod);

module.exports = router;
