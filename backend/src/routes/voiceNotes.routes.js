const express = require('express');
const router = express.Router();
const {
  uploadVoiceNoteAudio,
  createVoiceNote,
  getVoiceNotes,
  getVoiceNoteById,
  updateVoiceNote,
  deleteVoiceNote,
  getVoiceNotesByCategory,
} = require('../controllers/voiceNotes.controller');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { requireActiveSubscription } = require('../middleware/subscription.middleware');

router.use(verifyToken, checkRole('landlord'), requireActiveSubscription);

router.post('/upload-audio', uploadVoiceNoteAudio);
router.post('/', createVoiceNote);
router.get('/', getVoiceNotes);
router.get('/category/:category', getVoiceNotesByCategory);
router.get('/:id', getVoiceNoteById);
router.put('/:id', updateVoiceNote);
router.delete('/:id', deleteVoiceNote);

module.exports = router;
