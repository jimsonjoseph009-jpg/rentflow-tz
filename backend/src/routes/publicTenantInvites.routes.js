const express = require('express');
const router = express.Router();

const { getInvite, acceptInvite } = require('../controllers/publicTenantInvites.controller');
const { requireFields } = require('../middleware/validation.middleware');

router.get('/:token', getInvite);
router.post('/:token/accept', requireFields(['password']), acceptInvite);

module.exports = router;

