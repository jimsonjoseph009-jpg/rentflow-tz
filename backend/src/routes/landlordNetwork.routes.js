const express = require('express');
const router = express.Router();
const { createLandlordNetworkMember, getLandlordNetworkMembers, getLandlordNetworkMemberById, updateLandlordNetworkMember, deleteLandlordNetworkMember, getNetworkStats } = require('../controllers/landlordNetwork.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');

router.post('/', verifyToken, checkRole('landlord'), createLandlordNetworkMember);
router.get('/', verifyToken, checkRole('landlord'), getLandlordNetworkMembers);
router.get('/stats', verifyToken, checkRole('landlord'), getNetworkStats);
router.get('/:id', verifyToken, checkRole('landlord'), getLandlordNetworkMemberById);
router.put('/:id', verifyToken, checkRole('landlord'), updateLandlordNetworkMember);
router.delete('/:id', verifyToken, checkRole('landlord'), deleteLandlordNetworkMember);

module.exports = router;
