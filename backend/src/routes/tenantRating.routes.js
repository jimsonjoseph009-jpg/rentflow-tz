const express = require('express');
const router = express.Router();
const { createTenantRating, getTenantRatings, getTenantRatingById, updateTenantRating, deleteTenantRating } = require('../controllers/tenantRating.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');

router.use(verifyToken, checkRole('landlord'), requireActiveSubscription);

router.post('/', createTenantRating);
router.get('/', getTenantRatings);
router.get('/:id', getTenantRatingById);
router.put('/:id', updateTenantRating);
router.delete('/:id', deleteTenantRating);

module.exports = router;
