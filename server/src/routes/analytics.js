import express from 'express';
import {
  getDashboardStats,
  getComplaintsByCategory,
  getComplaintsByUrgency,
  getMonthlyTrends,
  getResolutionTimeAnalysis,
  getSatisfactionAnalysis,
  getDepartmentPerformance,
  getSentimentAnalysis
} from '../controllers/analyticsController.js';
import { authenticateToken, authorize, authorizeDepartment } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Dashboard statistics
router.get('/dashboard', generalLimiter, getDashboardStats);

// Category analysis
router.get('/category', generalLimiter, getComplaintsByCategory);

// Urgency analysis
router.get('/urgency', generalLimiter, getComplaintsByUrgency);

// Monthly trends
router.get('/trends/monthly', generalLimiter, getMonthlyTrends);

// Resolution time analysis
router.get('/resolution-time', generalLimiter, getResolutionTimeAnalysis);

// Satisfaction analysis
router.get('/satisfaction', generalLimiter, getSatisfactionAnalysis);

// Sentiment analysis
router.get('/sentiment', generalLimiter, getSentimentAnalysis);

// Department performance (Master Admin only)
router.get('/department-performance', authorize('master_admin'), generalLimiter, getDepartmentPerformance);

// Department-specific trends
router.get('/trends/monthly/:department', authorizeDepartment, generalLimiter, getMonthlyTrends);

export default router;
