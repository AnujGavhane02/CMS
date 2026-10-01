import express from 'express';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  addSubAdmin,
  removeSubAdmin,
  getDepartmentStats,
  getAllDepartmentStats
} from '../controllers/departmentController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { validateObjectId, validatePagination } from '../middleware/validation.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all departments (accessible to all authenticated users for complaint filing)
router.get('/', generalLimiter, validatePagination, getAllDepartments);

// Get all department statistics (Master Admin only)
router.get('/stats', authorize('master_admin'), getAllDepartmentStats);

// Get department by ID
router.get('/:id', validateObjectId, getDepartmentById);

// Get department statistics
router.get('/:id/stats', validateObjectId, getDepartmentStats);

// Create new department (Master Admin only)
router.post('/', authorize('master_admin'), createDepartment);

// Update department (Master Admin only)
router.put('/:id', authorize('master_admin'), validateObjectId, updateDepartment);

// Delete department (Master Admin only)
router.delete('/:id', authorize('master_admin'), validateObjectId, deleteDepartment);

// Add sub-admin to department (Master Admin only)
router.post('/:id/sub-admins', authorize('master_admin'), validateObjectId, addSubAdmin);

// Remove sub-admin from department (Master Admin only)
router.delete('/:id/sub-admins', authorize('master_admin'), validateObjectId, removeSubAdmin);

export default router;
