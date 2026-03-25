const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const {
  getWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  getWorkflowRuns,
  triggerWorkflowTest,
  createWorkflowFromTemplate,
} = require('../controllers/workflow.controller');

router.get('/', verifyToken, checkRole('landlord'), getWorkflows);
router.post('/', verifyToken, checkRole('landlord'), createWorkflow);
router.put('/:id', verifyToken, checkRole('landlord'), updateWorkflow);
router.delete('/:id', verifyToken, checkRole('landlord'), deleteWorkflow);
router.get('/runs/list', verifyToken, checkRole('landlord'), getWorkflowRuns);
router.post('/trigger-test', verifyToken, checkRole('landlord'), triggerWorkflowTest);
router.post('/from-template', verifyToken, checkRole('landlord'), createWorkflowFromTemplate);

module.exports = router;
