const express = require('express');
const router = express.Router();
const { createPetPolicy, getPetPolicies, getPetPolicyById, updatePetPolicy, deletePetPolicy, getNonCompliantPets, getPetsByType } = require('../controllers/petPolicy.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');

router.use(verifyToken, checkRole('landlord'), requireActiveSubscription);

router.post('/', createPetPolicy);
router.get('/', getPetPolicies);
router.get('/non-compliant', getNonCompliantPets);
router.get('/type/:petType', getPetsByType);
router.get('/:id', getPetPolicyById);
router.put('/:id', updatePetPolicy);
router.delete('/:id', deletePetPolicy);

module.exports = router;
