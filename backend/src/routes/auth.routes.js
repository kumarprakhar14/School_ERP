const express = require('express');
const { login, getMe } = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { validate } = require('../validators/validate');
const { loginSchema } = require('../validators/authSchemas');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Fix 2: Rate limit login — 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' }
});

router.post('/login', loginLimiter, validate({ body: loginSchema }), login);
router.get('/me', authMiddleware, getMe);

module.exports = router;
