const express = require('express');
const router = express.Router();
const { createEmergencyContact, getEmergencyContacts, getEmergencyContactById, updateEmergencyContact, deleteEmergencyContact, getContactsByType } = require('../controllers/emergencyContacts.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');

router.use(verifyToken, requireActiveSubscription);

// Tenant-accessible routes
router.get('/', getEmergencyContacts);
router.get('/type/:contactType', getContactsByType);
router.get('/:id', getEmergencyContactById);

// Landlord-only management routes
router.post('/', checkRole('landlord'), createEmergencyContact);
router.put('/:id', checkRole('landlord'), updateEmergencyContact);
router.delete('/:id', checkRole('landlord'), deleteEmergencyContact);

module.exports = router;
