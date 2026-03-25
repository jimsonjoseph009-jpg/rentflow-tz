const express = require('express');
const router = express.Router();
const { createInventoryItem, getInventoryItems, getInventoryItemById, updateInventoryItem, deleteInventoryItem, getLowStockItems, getInventoryByCategory } = require('../controllers/maintenanceInventory.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');

router.use(verifyToken, checkRole('landlord'), requireActiveSubscription);

router.post('/', createInventoryItem);
router.get('/', getInventoryItems);
router.get('/low-stock', getLowStockItems);
router.get('/category/:category', getInventoryByCategory);
router.get('/:id', getInventoryItemById);
router.put('/:id', updateInventoryItem);
router.delete('/:id', deleteInventoryItem);

module.exports = router;
