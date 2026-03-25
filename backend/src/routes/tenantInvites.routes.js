const express = require('express');
const router = express.Router();

const { createTenantInvite } = require('../controllers/tenantInvites.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireFields } = require('../middleware/validation.middleware');

router.post('/', verifyToken, checkRole('landlord'), requireFields(['tenant_id']), createTenantInvite);

module.exports = router;

