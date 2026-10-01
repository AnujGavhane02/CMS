import express from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  sendEmailVerificationOtp,
  verifyEmailOtp,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import {
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate
} from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { generalLimiter, authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes
router.post('/register', generalLimiter, validateUserRegistration, register);
router.post('/login', authLimiter, validateUserLogin, login);
router.post('/refresh-token', generalLimiter, refreshToken);

// Email verification
router.post('/send-email-otp', generalLimiter, sendEmailVerificationOtp);
router.post('/verify-email-otp', generalLimiter, verifyEmailOtp);

// Password reset (no auth required)
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', generalLimiter, resetPassword);

// Protected routes
router.use(authenticateToken);

router.post('/logout', logout);
router.get('/profile', getProfile);
router.put('/profile', validateUserUpdate, updateProfile);
router.put('/change-password', changePassword);

export default router;
