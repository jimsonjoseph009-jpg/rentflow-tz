const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { getWorkflowTemplates } = require('../controllers/workflowTemplates.controller');

router.get('/', verifyToken, checkRole('landlord'), getWorkflowTemplates);

module.exports = router;
