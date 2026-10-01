import express from 'express';
import {
  getAllSubAdmins,
  getSubAdminById,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
  resetSubAdminPassword,
  getAvailableDepartments,
  getSubAdminStats
} from '../controllers/subAdminController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { validateObjectId, validatePagination, validateSubAdminCreation, validateSubAdminUpdate } from '../middleware/validation.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all sub-admins (Master Admin only)
router.get('/', authorize('master_admin'), generalLimiter, validatePagination, getAllSubAdmins);

// Get sub-admin statistics (Master Admin only)
router.get('/stats', authorize('master_admin'), getSubAdminStats);

// Get available departments for assignment (Master Admin only)
router.get('/available-departments', authorize('master_admin'), getAvailableDepartments);

// Get sub-admin by ID
router.get('/:id', validateObjectId, getSubAdminById);

// Create new sub-admin (Master Admin only)
router.post('/', authorize('master_admin'), validateSubAdminCreation, createSubAdmin);

// Update sub-admin (Master Admin only)
router.put('/:id', authorize('master_admin'), validateObjectId, validateSubAdminUpdate, updateSubAdmin);

// Delete sub-admin (Master Admin only)
router.delete('/:id', authorize('master_admin'), validateObjectId, deleteSubAdmin);

// Reset sub-admin password (Master Admin only)
router.post('/:id/reset-password', authorize('master_admin'), validateObjectId, resetSubAdminPassword);

export default router;

