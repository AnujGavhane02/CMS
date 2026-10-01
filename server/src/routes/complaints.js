import express from 'express';
import {
  createComplaint,
  getAllComplaints,
  getComplaintById,
  updateComplaintStatus,
  assignComplaint,
  addInternalNote,
  addFeedback,
  getComplaintsByDepartment,
  getUserComplaints,
  updateComplaintDepartment
} from '../controllers/complaintController.js';
import { authenticateToken, authorizeComplaintAccess, authorizeDepartment } from '../middleware/auth.js';
import {
  validateComplaintCreation,
  validateComplaintUpdate,
  validateFeedback,
  validateObjectId,
  validateComplaintIdParam,
  validatePagination,
  validateComplaintFilters
} from '../middleware/validation.js';
import { complaintCreationLimiter, generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create complaint
router.post('/', complaintCreationLimiter, validateComplaintCreation, createComplaint);

// Get all complaints with filters
router.get('/', generalLimiter, validatePagination, validateComplaintFilters, getAllComplaints);

// Get complaints by department
router.get('/department/:department', authorizeDepartment, getComplaintsByDepartment);

// Get user's complaints
router.get('/user/:userId?', getUserComplaints);

// Get complaint by ID (with access control)
router.get('/:id', validateComplaintIdParam, authorizeComplaintAccess, getComplaintById);

// Update complaint status (admin/sub-admin only)
router.put('/:id/status', validateComplaintIdParam, authorizeComplaintAccess, validateComplaintUpdate, updateComplaintStatus);

// Assign complaint (admin/sub-admin only)
router.put('/:id/assign', validateComplaintIdParam, authorizeComplaintAccess, assignComplaint);

// Add internal note (admin/sub-admin only)
router.post('/:id/note', validateComplaintIdParam, authorizeComplaintAccess, addInternalNote);

// Add feedback (user only, for their own complaints)
router.post('/:id/feedback', validateComplaintIdParam, authorizeComplaintAccess, validateFeedback, addFeedback);

// Update complaint department (Master Admin only)
router.put('/:id/department', validateComplaintIdParam, updateComplaintDepartment);

export default router;
