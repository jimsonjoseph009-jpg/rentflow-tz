const express = require('express');
const router = express.Router();
const { createProperty, getProperties, getPropertiesMap, updateProperty, updatePropertyLocation, deleteProperty } = require('../controllers/property.controller');
const {
  getFavorites,
  addFavorite,
  removeFavorite,
  getSavedSearches,
  createSavedSearch,
  deleteSavedSearch,
  markSavedSearchSeen,
} = require('../controllers/propertyDiscovery.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { enforceQuotaLimit, requireActiveSubscription } = require('../middleware/subscription.middleware');

router.post('/', verifyToken, checkRole('landlord'), requireActiveSubscription, enforceQuotaLimit('properties'), createProperty);
router.get('/', verifyToken, checkRole('landlord'), requireActiveSubscription, getProperties);
router.get('/map', verifyToken, checkRole('landlord'), requireActiveSubscription, getPropertiesMap);
router.get('/favorites', verifyToken, checkRole('landlord'), requireActiveSubscription, getFavorites);
router.post('/favorites/:propertyId', verifyToken, checkRole('landlord'), requireActiveSubscription, addFavorite);
router.delete('/favorites/:propertyId', verifyToken, checkRole('landlord'), requireActiveSubscription, removeFavorite);
router.get('/saved-searches', verifyToken, checkRole('landlord'), requireActiveSubscription, getSavedSearches);
router.post('/saved-searches', verifyToken, checkRole('landlord'), requireActiveSubscription, createSavedSearch);
router.put('/saved-searches/:id/mark-seen', verifyToken, checkRole('landlord'), requireActiveSubscription, markSavedSearchSeen);
router.delete('/saved-searches/:id', verifyToken, checkRole('landlord'), requireActiveSubscription, deleteSavedSearch);
router.put('/:id/location', verifyToken, checkRole('landlord'), requireActiveSubscription, updatePropertyLocation);
router.put('/:id', verifyToken, checkRole('landlord'), requireActiveSubscription, updateProperty);
router.delete('/:id', verifyToken, checkRole('landlord'), requireActiveSubscription, deleteProperty);

module.exports = router;
