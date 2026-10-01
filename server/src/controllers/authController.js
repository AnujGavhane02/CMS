import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logger } from '../config/logger.js';
import { sendOtpEmail } from '../utils/email.js';

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  return { accessToken, refreshToken };
};

// Generate a 6-digit numeric OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const OTP_EXPIRY_MINUTES = 10;

// Register new user — creates account and sends email verification OTP
export const register = async (req, res) => {
  try {
    const { name, email, password, role = 'user', department } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    if (role === 'sub_admin' && !department) {
      return res.status(400).json({
        success: false,
        message: 'Department is required for sub-admin role'
      });
    }

    const otp = generateOtp();
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const user = new User({
      name,
      email,
      password,
      role,
      isVerified: role === 'sub_admin',
      isEmailVerified: false,
      emailVerifyOtp: otp,
      emailVerifyOtpExpiry: expiry,
      department: role === 'sub_admin' ? department : undefined
    });

    await user.save();

    try {
      await sendOtpEmail(user, otp, 'email_verify');
    } catch (emailError) {
      logger.error('Failed to send verification OTP email:', emailError);
      return res.status(503).json({
        success: false,
        message: 'Account created, but the verification email could not be sent. Please sign in and request a new OTP after email service is configured.'
      });
    }

    logger.info(`New user registered: ${email}`, { userId: user._id, role });

    res.status(201).json({
      success: true,
      message: 'Registration successful. An OTP has been sent to your email — please verify it to continue.'
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// Resend email verification OTP
export const sendEmailVerificationOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findByEmail(email).select('+emailVerifyOtp +emailVerifyOtpExpiry');
    if (!user) {
      // Return 200 to avoid leaking whether an account exists
      return res.json({ success: true, message: 'If this email is registered, an OTP has been sent.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified.' });
    }

    const otp = generateOtp();
    user.emailVerifyOtp = otp;
    user.emailVerifyOtpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    await sendOtpEmail(user, otp, 'email_verify');

    res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (error) {
    logger.error('Send email OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

// Verify email with OTP
export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findByEmail(email).select('+emailVerifyOtp +emailVerifyOtpExpiry');
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid OTP or email' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified.' });
    }

    if (!user.emailVerifyOtp || !user.emailVerifyOtpExpiry) {
      return res.status(400).json({ success: false, message: 'No pending OTP. Please request a new one.' });
    }

    if (new Date() > user.emailVerifyOtpExpiry) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (user.emailVerifyOtp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    user.isEmailVerified = true;
    user.emailVerifyOtp = undefined;
    user.emailVerifyOtpExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    logger.info(`Email verified for user: ${email}`);

    res.json({
      success: true,
      message: 'Email verified successfully! Your account is now pending admin approval.'
    });
  } catch (error) {
    logger.error('Verify email OTP error:', error);
    res.status(500).json({ success: false, message: 'Email verification failed' });
  }
};

// Forgot password — sends OTP to registered email
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findByEmail(email);

    // Always respond with 200 to avoid leaking account existence
    if (!user) {
      return res.json({ success: true, message: 'If this email is registered, an OTP has been sent.' });
    }

    const otp = generateOtp();
    user.passwordResetOtp = otp;
    user.passwordResetOtpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    sendOtpEmail(user, otp, 'password_reset').catch((err) =>
      logger.error('Failed to send password reset OTP:', err)
    );

    logger.info(`Password reset OTP sent to: ${email}`);

    res.json({ success: true, message: 'If this email is registered, an OTP has been sent.' });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

// Reset password — verifies OTP and sets new password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP and new password are required' });
    }

    const user = await User.findByEmail(email).select('+passwordResetOtp +passwordResetOtpExpiry +password');
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid OTP or email' });
    }

    if (!user.passwordResetOtp || !user.passwordResetOtpExpiry) {
      return res.status(400).json({ success: false, message: 'No pending OTP. Please request a new one.' });
    }

    if (new Date() > user.passwordResetOtpExpiry) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (user.passwordResetOtp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    user.password = newPassword;
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpiry = undefined;
    // Invalidate all sessions
    user.refreshTokens = [];
    await user.save();

    logger.info(`Password reset for user: ${email}`);

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      logger.warn(`Login failed: user not found — ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Email must be verified before anything else
    if (!user.isEmailVerified) {
      logger.warn(`Login failed: email not verified — ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Please verify your email address first. Check your inbox for the OTP.'
      });
    }

    // Admin must have approved the account
    if (!user.isVerified) {
      logger.warn(`Login failed: account not admin-approved — ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Your account is pending admin approval. You will be notified once approved.'
      });
    }

    if (!user.isActive) {
      logger.warn(`Login failed: account deactivated — ${email}`);
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    if (!user.password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      logger.warn(`Login failed: wrong password — ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    await user.addRefreshToken(refreshToken);
    await user.updateLastLogin();

    logger.info(`User logged in: ${email}`, { userId: user._id, role: user.role });

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: user.fullProfile, accessToken, refreshToken }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Login failed'
    });
  }
};

// Refresh access token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.refreshTokens.some(token => token.token === refreshToken)) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const { accessToken } = generateTokens(user._id);

    res.json({ success: true, message: 'Token refreshed successfully', data: { accessToken } });
  } catch (error) {
    logger.error('Token refresh error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
    res.status(500).json({ success: false, message: 'Token refresh failed' });
  }
};

// Logout user
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = req.user;

    if (refreshToken) {
      await user.removeRefreshToken(refreshToken);
    } else {
      user.refreshTokens = [];
      await user.save({ validateBeforeSave: false });
    }

    logger.info(`User logged out: ${user.email}`);
    res.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    res.json({ success: true, data: { user: req.user.fullProfile } });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email, department } = req.body;
    const user = req.user;

    if (email && email !== user.email) {
      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already exists' });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (department && user.role === 'sub_admin') user.department = department;

    await user.save();

    logger.info(`Profile updated: ${user.email}`);
    res.json({ success: true, message: 'Profile updated successfully', data: { user: user.fullProfile } });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Profile update failed' });
  }
};

// Change password (authenticated)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    user.refreshTokens = [];
    await user.save({ validateBeforeSave: false });

    logger.info(`Password changed: ${user.email}`);
    res.json({ success: true, message: 'Password changed successfully. Please login again.' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Password change failed' });
  }
};
