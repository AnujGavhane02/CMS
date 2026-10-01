import express from 'express';
import {
  getSubAdminReports,
  getDepartmentComparison
} from '../controllers/subAdminReportsController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { validateSubAdminId } from '../middleware/validation.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get sub-admin reports (Sub-admin can access their own, Master Admin can access any)
router.get('/:subAdminId', 
  authorize('master_admin', 'sub_admin'), 
  validateSubAdminId, 
  generalLimiter, 
  getSubAdminReports
);

// Get department comparison data (Master Admin only)
router.get('/:subAdminId/comparison', 
  authorize('master_admin'), 
  validateSubAdminId, 
  generalLimiter, 
  getDepartmentComparison
);

export default router;
