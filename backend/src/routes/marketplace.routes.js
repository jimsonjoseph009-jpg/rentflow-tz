const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const {
  getPublicListings,
  getMyListings,
  createListing,
  updateListing,
  deleteListing,
} = require('../controllers/marketplace.controller');

router.get('/public', getPublicListings);
router.get('/mine', verifyToken, checkRole('landlord'), getMyListings);
router.post('/', verifyToken, checkRole('landlord'), createListing);
router.put('/:id', verifyToken, checkRole('landlord'), updateListing);
router.delete('/:id', verifyToken, checkRole('landlord'), deleteListing);

module.exports = router;
