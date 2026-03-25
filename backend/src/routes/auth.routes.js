const express = require('express');
const router = express.Router();
const { register, login, logout, me, updateProfile, updateAvatar, changePassword } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const validateReq = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }
  next();
};

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').escape(),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password minimum 8 characters'),
  body('phone').optional().trim().escape(),
  validateReq
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validateReq
];

const profileValidation = [
  body('name').optional().trim().escape(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim().escape(),
  body('whatsapp_number').optional().trim().escape(),
  validateReq
];

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});


router.post('/register', registerValidation, register);
router.post('/login', loginLimiter, loginValidation, login);
router.post('/logout', logout);
router.get('/me', verifyToken, me);
router.put('/profile', verifyToken, profileValidation, updateProfile);
router.put('/avatar', verifyToken, updateAvatar);
router.post('/change-password', verifyToken, changePassword);

module.exports = router;
