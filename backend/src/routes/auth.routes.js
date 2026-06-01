import express from 'express';
import { login, getMe } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validate } from '../validators/validate.js';
import { loginSchema } from '../validators/authSchemas.js';
import rateLimit from 'express-rate-limit';

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

export default router;
