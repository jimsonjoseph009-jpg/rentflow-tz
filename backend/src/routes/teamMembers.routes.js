const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} = require('../controllers/teamMembers.controller');

router.get('/', verifyToken, checkRole('landlord'), getTeamMembers);
router.post('/', verifyToken, checkRole('landlord'), createTeamMember);
router.put('/:id', verifyToken, checkRole('landlord'), updateTeamMember);
router.delete('/:id', verifyToken, checkRole('landlord'), deleteTeamMember);

module.exports = router;
