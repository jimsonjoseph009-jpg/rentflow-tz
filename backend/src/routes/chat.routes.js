const express = require('express');
const router = express.Router();

const {
  listThreads,
  streamChat,
  getThreadWithMessages,
  sendLandlordMessage,
  createTenantChatLink,
  getPublicChatByToken,
  sendTenantMessageByToken,
  getTenantThread,
  getTenantMessages,
  sendTenantMessage,
  uploadChatMedia,
} = require('../controllers/chat.controller');

const { verifyToken, verifyTokenQueryOrHeader, checkRole, verifyUploadAccess } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');
const { requireFields } = require('../middleware/validation.middleware');

const requireActiveSubscriptionIfLandlord = (req, res, next) => {
  if (req.user?.role === 'landlord') {
    return requireActiveSubscription(req, res, next);
  }
  return next();
};

// Realtime chat stream (SSE)
router.get('/stream', verifyTokenQueryOrHeader, requireActiveSubscriptionIfLandlord, streamChat);

// Landlord inbox
router.get('/threads', verifyToken, checkRole('landlord'), requireActiveSubscription, listThreads);
router.get('/threads/tenant/:tenantId', verifyToken, checkRole('landlord'), requireActiveSubscription, getThreadWithMessages);
router.post(
  '/threads/:threadId/messages',
  verifyToken,
  checkRole('landlord'),
  requireActiveSubscription,
  requireFields(['body']),
  sendLandlordMessage
);
router.post('/tenant-links', verifyToken, checkRole('landlord'), requireActiveSubscription, createTenantChatLink);

// Tenant public chat (token)
router.get('/public/:token', getPublicChatByToken);
router.post('/public/:token/messages', requireFields(['body']), sendTenantMessageByToken);

// Tenant authenticated chat (tenant portal)
router.get('/tenant/thread', verifyToken, checkRole('tenant'), getTenantThread);
router.get('/tenant/messages', verifyToken, checkRole('tenant'), getTenantMessages);
router.post('/tenant/messages', verifyToken, checkRole('tenant'), requireFields(['body']), sendTenantMessage);

// Media upload
router.post('/upload', verifyUploadAccess, uploadChatMedia);

module.exports = router;
