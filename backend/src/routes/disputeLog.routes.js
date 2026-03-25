const express = require('express');
const router = express.Router();
const { createDispute, getDisputes, getDisputeById, updateDispute, deleteDispute, getOpenDisputes, getDisputesByStatus, getDisputesByCategory, getDisputeStats } = require('../controllers/disputeLog.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');

router.use(verifyToken, checkRole('landlord'), requireActiveSubscription);

router.post('/', createDispute);
router.get('/', getDisputes);
router.get('/open', getOpenDisputes);
router.get('/status/:status', getDisputesByStatus);
router.get('/category/:category', getDisputesByCategory);
router.get('/stats', getDisputeStats);
router.get('/:id', getDisputeById);
router.put('/:id', updateDispute);
router.delete('/:id', deleteDispute);

module.exports = router;
