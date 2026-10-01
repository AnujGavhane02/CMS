import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUsersByDepartment,
  getUserStats,
  getUnverifiedUsers,
  verifyUser
} from '../controllers/userController.js';
import { authenticateToken, authorize } from '../middleware/auth.js';
import { validateUserRegistration, validateUserUpdate, validateObjectId } from '../middleware/validation.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Master Admin only routes
router.get('/', authorize('master_admin'), generalLimiter, getAllUsers);
router.get('/stats', authorize('master_admin'), getUserStats);
router.post('/', authorize('master_admin'), validateUserRegistration, createUser);
router.get('/:id', validateObjectId, getUserById);
router.put('/:id', authorize('master_admin'), validateObjectId, validateUserUpdate, updateUser);
router.delete('/:id', authorize('master_admin'), validateObjectId, deleteUser);
router.get('/unverified/users',authorize('master_admin'),getUnverifiedUsers);
router.patch('/verify/:userId',authorize('master_admin'),verifyUser);

// Department-specific routes
router.get('/department/:department', getUsersByDepartment);

export default router;
